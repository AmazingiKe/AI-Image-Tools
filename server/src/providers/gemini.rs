//! Gemini Provider 实现
//!
//! 职责: 将统一请求转换为 Gemini API 格式，处理响应解析
//! 场景: 通过上游代理调用 Google Gemini 生图模型
//! 可替换性: 可替换为直接调用 Google API 或其他代理方式

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::models::{
    error::ModelError,
    openai::{ChatCompletionRequest, ChatCompletionResponse, ChatMessage, ImageResponse},
    provider::{
        ImageModelProvider, ModelCapability, ModelInfo, UnifiedImageData,
        UnifiedImageRequest, UnifiedImageResponse,
    },
};

/// Gemini 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiConfig {
    /// API 端点（支持 OpenAI 兼容格式的代理）
    pub api_endpoint: String,
    /// API 密钥
    pub api_key: String,
    /// 超时时间（秒）
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
}

fn default_timeout() -> u64 {
    300
}

/// Gemini Provider 实现
pub struct GeminiProvider {
    info: ModelInfo,
    config: GeminiConfig,
}

impl GeminiProvider {
    /// 创建新的 Gemini Provider
    pub fn new(config: GeminiConfig) -> Self {
        let mut capabilities = HashSet::new();
        capabilities.insert(ModelCapability::TextToImage);
        capabilities.insert(ModelCapability::ImageToImage);
        capabilities.insert(ModelCapability::NegativePrompt);
        capabilities.insert(ModelCapability::MultiImageInput);
        capabilities.insert(ModelCapability::HighResolution);

        let info = ModelInfo {
            id: "gemini-3-pro-image".to_string(),
            name: "Gemini 2.5 Pro Image".to_string(),
            description: "Google Gemini 2.5 Pro 生图模型".to_string(),
            supported_sizes: vec![
                "1024x1024".to_string(),
                "1280x720".to_string(),
                "720x1280".to_string(),
                "1216x896".to_string(),
            ],
            capabilities,
            provider: "gemini".to_string(),
            enabled: true,
        };

        Self { info, config }
    }

    /// 创建带指定模型的 Provider（支持 gemini-3-flash 等变体）
    pub fn with_model(config: GeminiConfig, model_id: String, model_name: String) -> Self {
        let mut provider = Self::new(config);
        provider.info.id = model_id;
        provider.info.name = model_name;
        provider
    }

    /// 从旧版配置创建
    pub fn from_legacy(proxy_url: String, api_key: String, timeout: u64) -> Self {
        Self::new(GeminiConfig {
            api_endpoint: proxy_url,
            api_key,
            timeout_secs: timeout,
        })
    }

    /// 构建请求 URL
    fn build_url(&self) -> String {
        let url = self.config.api_endpoint.trim_end_matches('/');
        if url.contains("/v1") {
            format!("{}/chat/completions", url)
        } else {
            format!("{}/v1/chat/completions", url)
        }
    }

    /// 转换统一请求为 Gemini Chat 格式
    fn convert_request(&self, req: &UnifiedImageRequest) -> ChatCompletionRequest {
        // 构建完整提示词（包含负向提示）
        let full_prompt = if let Some(neg) = &req.negative_prompt {
            let trimmed = neg.trim();
            if !trimmed.is_empty() {
                format!("{}\nNegative prompt: {}", req.prompt, trimmed)
            } else {
                req.prompt.clone()
            }
        } else {
            req.prompt.clone()
        };

        // 构建多模态内容
        let mut content_array = vec![serde_json::json!({
            "type": "text",
            "text": full_prompt
        })];

        // 添加参考图
        if let Some(images) = &req.images {
            for img_data in images {
                content_array.push(serde_json::json!({
                    "type": "image_url",
                    "image_url": { "url": img_data }
                }));
            }
        }

        ChatCompletionRequest {
            model: req.model.clone(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: serde_json::Value::Array(content_array),
            }],
            temperature: None,
            max_tokens: None,
        }
    }

    /// 从 Markdown 格式提取图片 URL
    fn extract_image_url(content: &str) -> Option<String> {
        // 优先匹配 Markdown 图片格式 ![alt](url)
        if let Some(start) = content.find("](") {
            let sub = &content[start + 2..];
            if let Some(end) = sub.find(')') {
                let mut url = sub[..end].trim().to_string();
                // 去除可能的引号和空格
                if let Some(space_idx) = url.find(|c: char| c.is_whitespace()) {
                    url = url[..space_idx].to_string();
                }
                return Some(url.trim_matches(|c| c == '"' || c == '\'').to_string());
            }
        }

        // 兜底：从纯文本搜索 http 链接
        if let Some(start) = content.find("http") {
            let sub = &content[start..];
            let end = sub
                .find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == ')' || c == ']')
                .unwrap_or(sub.len());
            return Some(sub[..end].to_string());
        }

        None
    }
}

#[async_trait]
impl ImageModelProvider for GeminiProvider {
    fn info(&self) -> &ModelInfo {
        &self.info
    }

    fn validate_request(&self, req: &UnifiedImageRequest) -> Result<(), ModelError> {
        // 检查模型 ID 是否匹配
        if !req.model.starts_with("gemini-") {
            return Err(ModelError::ValidationError(format!(
                "模型 ID 不匹配: {} 不是 Gemini 模型",
                req.model
            )));
        }

        // 检查尺寸支持
        if !self.info.supports_size(&req.size) {
            return Err(ModelError::UnsupportedParameter(format!(
                "不支持的尺寸: {}。支持的尺寸: {:?}",
                req.size, self.info.supported_sizes
            )));
        }

        // 检查参考图数量限制
        if let Some(images) = &req.images {
            if images.len() > 10 {
                return Err(ModelError::ValidationError(
                    "参考图数量超过限制（最大 10 张）".to_string(),
                ));
            }
        }

        Ok(())
    }

    async fn generate(
        &self,
        request: UnifiedImageRequest,
        client: &reqwest::Client,
    ) -> Result<UnifiedImageResponse, ModelError> {
        // 验证请求
        self.validate_request(&request)?;

        let url = self.build_url();
        let chat_payload = self.convert_request(&request);

        tracing::info!(
            "🚀 调用 Gemini Provider | 模型: {} | URL: {}",
            request.model,
            url
        );

        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .timeout(std::time::Duration::from_secs(self.config.timeout_secs))
            .json(&chat_payload)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(ModelError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        // 解析响应
        let chat_resp: ChatCompletionResponse = response.json().await.map_err(|e| {
            ModelError::ParseError(format!("JSON 解析失败: {}", e))
        })?;

        let mut data = Vec::new();
        for choice in chat_resp.choices {
            let content = choice.message.content;
            let image_url = Self::extract_image_url(&content)
                .ok_or_else(|| ModelError::ParseError(format!("无法解析图片地址: {}", content)))?;

            data.push(UnifiedImageData {
                url: Some(image_url),
                b64_json: None,
                revised_prompt: Some(content.clone()),
            });
        }

        let result = UnifiedImageResponse {
            created: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            data,
        };

        tracing::info!("✅ Gemini Provider 响应成功 | 生成图片数: {}", result.data.len());

        Ok(result)
    }

    async fn health_check(&self, client: &reqwest::Client) -> Result<bool, ModelError> {
        // 使用简单的请求测试连接
        let url = self.build_url();

        match client
            .get(&url.replace("/chat/completions", "/models"))
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
        {
            Ok(resp) => Ok(resp.status().is_success() || resp.status().as_u16() == 404),
            Err(_) => Ok(false),
        }
    }
}
