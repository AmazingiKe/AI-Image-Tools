//! 图像模型 Provider 核心 Trait 定义
//!
//! 职责: 定义多模型支持的统一接口，所有图像生成模型必须实现此 Trait
//! 场景: 支持 Gemini、DALL-E、通义万相等多种生图模型的动态接入
//! 可替换性: 新增模型只需实现此 Trait，无需修改现有代码

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// 统一图像生成请求格式
/// 对外暴露 OpenAI 兼容 API，内部转换为各模型特定格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedImageRequest {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub images: Option<Vec<String>>, // Base64 编码的参考图
    pub model: String,
    pub n: usize,
    pub size: String,
    pub response_format: String,
    pub extra_params: Option<serde_json::Value>, // 模型特定参数
}

impl Default for UnifiedImageRequest {
    fn default() -> Self {
        Self {
            prompt: String::new(),
            negative_prompt: None,
            images: None,
            model: String::new(),
            n: 1,
            size: "1024x1024".to_string(),
            response_format: "url".to_string(),
            extra_params: None,
        }
    }
}

/// 统一图像生成响应格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedImageResponse {
    pub created: u64,
    pub data: Vec<UnifiedImageData>,
}

/// 统一图像数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedImageData {
    pub url: Option<String>,
    pub b64_json: Option<String>,
    pub revised_prompt: Option<String>,
}

/// 模型能力标识
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ModelCapability {
    /// 文生图
    TextToImage,
    /// 图生图
    ImageToImage,
    /// 支持负向提示词
    NegativePrompt,
    /// 支持多图输入
    MultiImageInput,
    /// 支持高分辨率
    HighResolution,
    /// 支持提示词美化
    PromptEnhancement,
}

/// 模型元信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// 模型唯一标识符
    pub id: String,
    /// 模型显示名称
    pub name: String,
    /// 模型描述
    pub description: String,
    /// 支持的生图尺寸列表
    pub supported_sizes: Vec<String>,
    /// 模型能力集合
    pub capabilities: HashSet<ModelCapability>,
    /// 提供商名称
    pub provider: String,
    /// 是否默认启用
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

impl ModelInfo {
    /// 检查模型是否支持特定能力
    pub fn supports(&self, capability: ModelCapability) -> bool {
        self.capabilities.contains(&capability)
    }

    /// 检查模型是否支持指定尺寸
    pub fn supports_size(&self, size: &str) -> bool {
        self.supported_sizes.contains(&size.to_string())
    }
}

/// 模型 Provider Trait
/// 所有生图模型必须实现此 Trait 才能被注册到系统中
#[async_trait]
pub trait ImageModelProvider: Send + Sync {
    /// 获取模型信息
    fn info(&self) -> &ModelInfo;

    /// 验证请求是否被支持
    fn validate_request(&self, req: &UnifiedImageRequest) -> Result<(), crate::models::ModelError>;

    /// 执行图像生成（核心方法）
    async fn generate(
        &self,
        request: UnifiedImageRequest,
        client: &reqwest::Client,
    ) -> Result<UnifiedImageResponse, crate::models::ModelError>;

    /// 健康检查
    async fn health_check(&self, client: &reqwest::Client) -> Result<bool, crate::models::ModelError>;
}

/// 从 OpenAI 请求转换为统一请求
impl From<crate::models::openai::ImageGenerationRequest> for UnifiedImageRequest {
    fn from(req: crate::models::openai::ImageGenerationRequest) -> Self {
        // 处理单张图和多张图的合并
        let mut images = req.images.unwrap_or_default();
        if let Some(img) = req.image {
            images.push(img);
        }

        Self {
            prompt: req.prompt,
            negative_prompt: req.negative_prompt,
            images: if images.is_empty() { None } else { Some(images) },
            model: req.model,
            n: req.n,
            size: req.size,
            response_format: req.response_format,
            extra_params: None,
        }
    }
}

/// 从统一响应转换为 OpenAI 响应
impl From<UnifiedImageResponse> for crate::models::openai::ImageResponse {
    fn from(resp: UnifiedImageResponse) -> Self {
        Self {
            created: resp.created,
            data: resp
                .data
                .into_iter()
                .map(|d| crate::models::openai::ImageData {
                    url: d.url,
                    b64_json: d.b64_json,
                    revised_prompt: d.revised_prompt,
                })
                .collect(),
        }
    }
}
