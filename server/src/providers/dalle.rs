//! DALL-E Provider 实现
//!
//! 职责: 调用 OpenAI DALL-E API 进行图像生成
//! 场景: 标准 OpenAI Image API 兼容的模型
//! 可替换性: 适用于 OpenAI、智谱清言、字节豆包等兼容 API

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::models::{
    error::ModelError,
    provider::{
        ImageModelProvider, ModelCapability, ModelInfo, UnifiedImageData,
        UnifiedImageRequest, UnifiedImageResponse,
    },
};

/// DALL-E 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DalleConfig {
    /// API 端点（默认 OpenAI 官方 API）
    #[serde(default = "default_endpoint")]
    pub api_endpoint: String,
    /// API 密钥
    pub api_key: String,
    /// 超时时间（秒）
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
}

fn default_endpoint() -> String {
    "https://api.openai.com/v1".to_string()
}

fn default_timeout() -> u64 {
    120
}

/// DALL-E API 请求格式
#[derive(Debug, Serialize)]
struct DalleApiRequest {
    model: String,
    prompt: String,
    n: usize,
    size: String,
    response_format: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    style: Option<String>,
}

/// DALL-E API 响应格式
#[derive(Debug, Deserialize)]
struct DalleApiResponse {
    created: u64,
    data: Vec<DalleImageData>,
}

#[derive(Debug, Deserialize)]
struct DalleImageData {
    url: Option<String>,
    b64_json: Option<String>,
    revised_prompt: Option<String>,
}

/// DALL-E Provider 实现
pub struct DalleProvider {
    info: ModelInfo,
    config: DalleConfig,
}

impl DalleProvider {
    /// 创建新的 DALL-E Provider
    pub fn new(config: DalleConfig) -> Self {
        let mut capabilities = HashSet::new();
        capabilities.insert(ModelCapability::TextToImage);
        capabilities.insert(ModelCapability::HighResolution);

        let info = ModelInfo {
            id: "dall-e-3".to_string(),
            name: "DALL-E 3".to_string(),
            description: "OpenAI DALL-E 3 生图模型".to_string(),
            supported_sizes: vec![
                "1024x1024".to_string(),
                "1024x1792".to_string(),
                "1792x1024".to_string(),
            ],
            capabilities,
            provider: "openai".to_string(),
            enabled: true,
        };

        Self { info, config }
    }

    /// 创建指定模型的 Provider（支持 dall-e-2 等）
    pub fn with_model(config: DalleConfig, model_id: String, model_name: String) -> Self {
        let supported_sizes = if model_id == "dall-e-2" {
            vec![
                "256x256".to_string(),
                "512x512".to_string(),
                "1024x1024".to_string(),
            ]
        } else {
            vec![
                "1024x1024".to_string(),
                "1024x1792".to_string(),
                "1792x1024".to_string(),
            ]
        };

        let mut capabilities = HashSet::new();
        capabilities.insert(ModelCapability::TextToImage);
        capabilities.insert(ModelCapability::HighResolution);

        let info = ModelInfo {
            id: model_id.clone(),
            name: model_name,
            description: format!("OpenAI {} 生图模型", model_id),
            supported_sizes,
            capabilities,
            provider: "openai".to_string(),
            enabled: true,
        };

        Self { info, config }
    }

    /// 构建请求 URL
    fn build_url(&self) -> String {
        let url = self.config.api_endpoint.trim_end_matches('/');
        format!("{}/images/generations", url)
    }

    /// 转换统一请求为 DALL-E API 格式
    fn convert_request(&self, req: &UnifiedImageRequest) -> DalleApiRequest {
        // DALL-E 不支持负向提示词，需要在提示词中表达
        let prompt = if let Some(neg) = &req.negative_prompt {
            let trimmed = neg.trim();
            if !trimmed.is_empty() {
                format!("{}\n\nPlease avoid: {}", req.prompt, trimmed)
            } else {
                req.prompt.clone()
            }
        } else {
            req.prompt.clone()
        };

        // 从 extra_params 中提取质量参数
        let quality = req
            .extra_params
            .as_ref()
            .and_then(|p| p.get("quality"))
            .and_then(|q| q.as_str())
            .map(|s| s.to_string());

        let style = req
            .extra_params
            .as_ref()
            .and_then(|p| p.get("style"))
            .and_then(|s| s.as_str())
            .map(|s| s.to_string());

        DalleApiRequest {
            model: req.model.clone(),
            prompt,
            n: req.n.min(10), // DALL-E 限制最多 10 张
            size: req.size.clone(),
            response_format: req.response_format.clone(),
            quality,
            style,
        }
    }
}

#[async_trait]
impl ImageModelProvider for DalleProvider {
    fn info(&self) -> &ModelInfo {
        &self.info
    }

    fn validate_request(&self, req: &UnifiedImageRequest) -> Result<(), ModelError> {
        // 检查模型 ID 是否匹配
        if !req.model.starts_with("dall-e-") {
            return Err(ModelError::ValidationError(format!(
                "模型 ID 不匹配: {} 不是 DALL-E 模型",
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

        // 检查参考图（DALL-E 不支持图生图）
        if req.images.is_some() && !req.images.as_ref().unwrap().is_empty() {
            return Err(ModelError::UnsupportedParameter(
                "DALL-E 不支持参考图输入".to_string(),
            ));
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
        let api_request = self.convert_request(&request);

        tracing::info!(
            "🚀 调用 DALL-E Provider | 模型: {} | URL: {}",
            request.model,
            url
        );

        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .timeout(std::time::Duration::from_secs(self.config.timeout_secs))
            .json(&api_request)
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
        let dalle_resp: DalleApiResponse = response.json().await.map_err(|e| {
            ModelError::ParseError(format!("JSON 解析失败: {}", e))
        })?;

        let data: Vec<UnifiedImageData> = dalle_resp
            .data
            .into_iter()
            .map(|d| UnifiedImageData {
                url: d.url,
                b64_json: d.b64_json,
                revised_prompt: d.revised_prompt,
            })
            .collect();

        let result = UnifiedImageResponse {
            created: dalle_resp.created,
            data,
        };

        tracing::info!("✅ DALL-E Provider 响应成功 | 生成图片数: {}", result.data.len());

        Ok(result)
    }

    async fn health_check(&self, client: &reqwest::Client) -> Result<bool, ModelError> {
        // 使用简单的 GET 请求测试连接
        let url = self.config.api_endpoint.trim_end_matches('/');

        match client
            .get(format!("{}/models", url))
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
