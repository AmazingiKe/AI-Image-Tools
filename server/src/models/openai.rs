use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageGenerationRequest {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub image: Option<String>,
    pub images: Option<Vec<String>>,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_n")]
    pub n: usize,
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_response_format")]
    pub response_format: String,
}

fn default_model() -> String { "gemini-3-pro-image".to_string() }
fn default_n() -> usize { 1 }
fn default_size() -> String { "1024x1024".to_string() }
fn default_response_format() -> String { "url".to_string() }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageResponse {
    pub created: u64,
    pub data: Vec<ImageData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageData {
    pub url: Option<String>,
    pub b64_json: Option<String>,
    pub revised_prompt: Option<String>,
}

// --- Chat Completion Structures (for upstream proxy requests and responses) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatCompletionResponse {
    pub choices: Vec<ChatChoice>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatChoice {
    pub message: ChatMessageResponse,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessageResponse {
    pub content: String,
}
