use axum::{
    extract::{Json, State, Query},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::{cors::CorsLayer, services::ServeDir};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use std::io::Write;
use zip::write::SimpleFileOptions;
use std::path::Path;

mod models;
mod storage;

#[derive(Clone)]
struct AppState {
    config: Arc<RwLock<Config>>,
    history: Arc<RwLock<Vec<GenerationGroup>>>,
    client: reqwest::Client,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GenerationGroup {
    pub prompt: String,
    pub timestamp: u64,
    pub images: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Config {
    proxy_url: String,
    fallback_proxy_url: Option<String>,
    api_key: String,
    admin_token: String,
    storage_path: String,
    port: u16,
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    #[serde(default = "default_retries")]
    pub retry_limit: usize,
}

fn default_timeout() -> u64 { 300 }
fn default_retries() -> usize { 10 }

impl Default for Config {
    fn default() -> Self {
        Self {
            proxy_url: "http://127.0.0.1:8045/v1".to_string(),
            fallback_proxy_url: None,
            api_key: "sk-52036e30e0c2472e9e1f981bd23b8b0b".to_string(),
            admin_token: "admin123".to_string(),
            storage_path: "./storage".to_string(),
            port: 3000,
            timeout: 300,
            retry_limit: 10,
        }
    }
}

async fn load_config() -> Config {
    match tokio::fs::read_to_string("config.json").await {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => {
            let config = Config::default();
            let _ = tokio::fs::write("config.json", serde_json::to_string_pretty(&config).unwrap()).await;
            config
        }
    }
}

async fn save_config(config: &Config) -> std::io::Result<()> {
    tokio::fs::write("config.json", serde_json::to_string_pretty(config).unwrap()).await
}

async fn load_history() -> Vec<GenerationGroup> {
    match tokio::fs::read_to_string("history.json").await {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

async fn save_history(history: &[GenerationGroup]) -> std::io::Result<()> {
    tokio::fs::write("history.json", serde_json::to_string_pretty(history).unwrap()).await
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,ai_image_tools=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = load_config().await;
    let history = load_history().await;
    let port = config.port;
    let storage_path = config.storage_path.clone();
    
    let state = AppState {
        config: Arc::new(RwLock::new(config)),
        history: Arc::new(RwLock::new(history)),
        client: reqwest::Client::new(),
    };

    let _ = tokio::fs::create_dir_all(&storage_path).await;

    let app = Router::new()
        .route("/v1/images/generations", post(generate_image))
        .route("/api/config", get(get_config).post(update_config))
        .route("/api/history", get(get_history).delete(clear_history))
        .route("/api/enhance-prompt", post(enhance_prompt))
        .route("/api/chat", post(chat_completions))
        .route("/api/export-zip", get(export_zip))
        .route("/health", get(|| async { "OK" }))
        .nest_service("/images", ServeDir::new(&storage_path))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(tower::limit::ConcurrencyLimitLayer::new(32))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await.unwrap();
    tracing::info!("后端服务已启动：{}", addr);
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct ChatRequest {
    messages: Vec<models::openai::ChatMessage>,
    model: Option<String>,
}

async fn chat_completions(
    State(state): State<AppState>,
    Json(payload): Json<ChatRequest>,
) -> impl IntoResponse {
    let (url_str, api_key) = {
        let config = state.config.read().await;
        (config.proxy_url.clone(), config.api_key.clone())
    };

    let url = if url_str.contains("/v1") {
        format!("{}/chat/completions", url_str.trim_end_matches('/'))
    } else {
        format!("{}/v1/chat/completions", url_str.trim_end_matches('/'))
    };

    let model = payload.model.unwrap_or_else(|| "gemini-3-flash".to_string());

    let chat_payload = serde_json::json!({
        "model": model,
        "messages": payload.messages,
    });

    let response = state.client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_payload)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(data) => return (StatusCode::OK, Json(data)).into_response(),
                    Err(e) => tracing::error!("解析聊天响应失败: {}", e),
                }
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                tracing::error!("聊天请求失败 ({}): {}", status, error_text);
            }
            (StatusCode::BAD_GATEWAY, "Failed to call chat completion").into_response()
        }
        Err(e) => {
            tracing::error!("连接代理失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

async fn get_config(State(state): State<AppState>) -> impl IntoResponse {
    let config = state.config.read().await;
    Json(config.clone())
}

async fn update_config(
    State(state): State<AppState>,
    Json(new_config): Json<Config>,
) -> impl IntoResponse {
    let mut config = state.config.write().await;
    *config = new_config.clone();
    let _ = save_config(&config).await;
    StatusCode::OK
}

async fn get_history(State(state): State<AppState>) -> impl IntoResponse {
    let history = state.history.read().await;
    Json(history.clone())
}

async fn clear_history(State(state): State<AppState>) -> impl IntoResponse {
    let mut history = state.history.write().await;
    history.clear();
    let _ = save_history(&history).await;
    StatusCode::OK
}

#[derive(Deserialize)]
struct EnhanceRequest {
    prompt: String,
}

async fn enhance_prompt(
    State(state): State<AppState>,
    Json(payload): Json<EnhanceRequest>,
) -> impl IntoResponse {
    let (url_str, api_key) = {
        let config = state.config.read().await;
        (config.proxy_url.clone(), config.api_key.clone())
    };

    let url = if url_str.contains("/v1") {
        format!("{}/chat/completions", url_str.trim_end_matches('/'))
    } else {
        format!("{}/v1/chat/completions", url_str.trim_end_matches('/'))
    };

    let chat_payload = serde_json::json!({
        "model": "gemini-3-flash", // Use gemini-3-flash for enhancement as requested
        "messages": [
            {
                "role": "system",
                "content": "You are a professional image prompt engineer. Your task is to 'beautify' or 'enhance' the user's input prompt. \
                            1. If the input is in Chinese, translate the core idea to English and expand it. \
                            2. Add artistic details like lighting, composition, style (e.g., cinematic, oil painting, hyper-realistic), and mood. \
                            3. Use professional vocabulary (e.g., 'octane render', '4k resolution', 'volumetric lighting'). \
                            4. Keep the original intent of the user. \
                            5. Output ONLY the final enhanced English prompt text, no explanations."
            },
            {
                "role": "user",
                "content": payload.prompt
            }
        ]
    });

    let response = state.client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_payload)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<models::openai::ChatCompletionResponse>().await {
                    Ok(data) => {
                        if let Some(choice) = data.choices.first() {
                            let content = choice.message.content.trim().to_string();
                            tracing::info!("提示词美化成功: {} -> {}", payload.prompt, content);
                            return (StatusCode::OK, content).into_response();
                        }
                    }
                    Err(e) => {
                        tracing::error!("解析美化响应失败: {}", e);
                    }
                }
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                tracing::error!("美化请求失败 ({}): {}", status, error_text);
            }
            (StatusCode::BAD_GATEWAY, "Failed to enhance prompt").into_response()
        }
        Err(e) => {
            tracing::error!("连接代理失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

#[derive(Deserialize)]
struct ExportZipQuery {
    timestamp: u64,
}

async fn export_zip(
    State(state): State<AppState>,
    Query(query): Query<ExportZipQuery>,
) -> impl IntoResponse {
    let history = state.history.read().await;
    let group = history.iter().find(|g| g.timestamp == query.timestamp);

    if let Some(group) = group {
        let storage_path = {
            let config = state.config.read().await;
            config.storage_path.clone()
        };

        let mut buf = Vec::new();
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
        let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

        for img_url in &group.images {
            if let Some(filename) = img_url.split('/').last() {
                let path = Path::new(&storage_path).join(filename);
                if let Ok(data) = tokio::fs::read(path).await {
                    let _ = zip.start_file(filename, options);
                    let _ = zip.write_all(&data);
                }
            }
        }

        let _ = zip.finish();

        Response::builder()
            .header("Content-Type", "application/zip")
            .header("Content-Disposition", format!("attachment; filename=\"images-{}.zip\"", query.timestamp))
            .body(axum::body::Body::from(buf))
            .unwrap()
    } else {
        (StatusCode::NOT_FOUND, "History group not found").into_response()
    }
}

async fn generate_image(
    State(state): State<AppState>,
    Json(payload): Json<models::openai::ImageGenerationRequest>,
) -> impl IntoResponse {
    let (proxy_url, fallback_url, api_key, storage_path, timeout, retry_limit) = {
        let config = state.config.read().await;
        (
            config.proxy_url.clone(),
            config.fallback_proxy_url.clone(),
            config.api_key.clone(),
            config.storage_path.clone(),
            config.timeout,
            config.retry_limit,
        )
    };

    tracing::info!("收到图像生成请求: {}", payload.prompt);

    match perform_generation(&state, &proxy_url, &api_key, &payload, &storage_path, timeout, retry_limit).await {
        Ok(data) => {
            // 保存到历史记录
            let images: Vec<String> = data.data.iter().filter_map(|d| d.url.clone()).collect();
            if !images.is_empty() {
                let mut history = state.history.write().await;
                history.insert(0, GenerationGroup {
                    prompt: payload.prompt.clone(),
                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() * 1000,
                    images,
                });
                if history.len() > 100 { history.truncate(100); }
                let _ = save_history(&history).await;
            }
            (StatusCode::OK, Json(data)).into_response()
        },
        Err(e) => {
            tracing::warn!("主代理失败: {}, 尝试备用代理...", e);
            if let Some(fallback) = fallback_url {
                match perform_generation(&state, &fallback, &api_key, &payload, &storage_path, timeout, retry_limit).await {
                    Ok(data) => {
                        let images: Vec<String> = data.data.iter().filter_map(|d| d.url.clone()).collect();
                        if !images.is_empty() {
                            let mut history = state.history.write().await;
                            history.insert(0, GenerationGroup {
                                prompt: payload.prompt.clone(),
                                timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() * 1000,
                                images,
                            });
                            if history.len() > 100 { history.truncate(100); }
                            let _ = save_history(&history).await;
                        }
                        (StatusCode::OK, Json(data)).into_response()
                    },
                    Err(e) => (StatusCode::BAD_GATEWAY, format!("主备代理均失败: {}", e)).into_response()
                }
            } else {
                (StatusCode::BAD_GATEWAY, format!("请求失败且无备用代理: {}", e)).into_response()
            }
        }
    }
}

async fn perform_generation(
    state: &AppState,
    url_str: &str,
    api_key: &str,
    payload: &models::openai::ImageGenerationRequest,
    storage_path: &str,
    timeout: u64,
    retry_limit: usize,
) -> Result<models::openai::ImageResponse, String> {
    let mut url = if !url_str.starts_with("http://") && !url_str.starts_with("https://") {
        format!("http://{}", url_str)
    } else {
        url_str.to_string()
    };

    // Standardize URL to always use /v1/chat/completions
    if url.contains("/images/generations") {
        url = url.replace("/images/generations", "/chat/completions");
    } else if !url.ends_with("/chat/completions") {
        let base = url.trim_end_matches('/');
        if base.ends_with("/v1") {
            url = format!("{}/chat/completions", base);
        } else {
            url = format!("{}/v1/chat/completions", base);
        }
    }

    let mut messages = Vec::new();
    
    // Combine prompt and negative prompt with cleaner formatting
    let full_prompt = if let Some(neg) = &payload.negative_prompt {
        let trimmed_neg = neg.trim();
        if !trimmed_neg.is_empty() {
            format!("{}\nNegative prompt: {}", payload.prompt, trimmed_neg)
        } else {
            payload.prompt.clone()
        }
    } else {
        payload.prompt.clone()
    };

    let mut content_array = vec![
        serde_json::json!({ "type": "text", "text": full_prompt })
    ];

    if let Some(img_data) = &payload.image {
        content_array.push(serde_json::json!({ "type": "image_url", "image_url": { "url": img_data } }));
    }

    if let Some(imgs) = &payload.images {
        for img_data in imgs {
            content_array.push(serde_json::json!({ "type": "image_url", "image_url": { "url": img_data } }));
        }
    }

    let content = serde_json::Value::Array(content_array);

    messages.push(models::openai::ChatMessage {
        role: "user".to_string(),
        content,
    });

    let chat_payload = models::openai::ChatCompletionRequest {
        model: payload.model.clone(),
        messages,
        temperature: None,
        max_tokens: None,
    };

    for attempt in 0..retry_limit {
        tracing::info!("🚀 正在尝试生成图像 [第 {}/{} 次] | 目标: {}", attempt + 1, retry_limit, url);
        
        if attempt > 0 {
            let delay = 2;
            tokio::time::sleep(tokio::time::Duration::from_secs(delay)).await;
        }

        let response = state.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .timeout(tokio::time::Duration::from_secs(timeout))
            .json(&chat_payload)
            .send()
            .await;

        match response {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    let chat_resp: models::openai::ChatCompletionResponse = resp.json().await.map_err(|e| e.to_string())?;
                    let mut image_data_vec = Vec::new();
                    
                    for choice in chat_resp.choices {
                        let content = choice.message.content;
                        let url = extract_url(&content).ok_or_else(|| format!("无法解析图片地址: {}", content))?;

                        let mut item = models::openai::ImageData {
                            url: Some(url.clone()),
                            b64_json: None,
                            revised_prompt: Some(content.clone()),
                        };

                        if let Ok(filename) = storage::download_and_save_image(&url, storage_path, &state.client).await {
                            item.url = Some(format!("/images/{}", filename));
                        }
                        
                        image_data_vec.push(item);
                    }
                    
                    return Ok(models::openai::ImageResponse {
                        created: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
                        data: image_data_vec,
                    });
                } else {
                    let error_text = resp.text().await.unwrap_or_default();
                    tracing::error!("❌ 上游请求失败 | 状态码: {} | 响应: {}", status, error_text);
                    if status.as_u16() >= 400 && status.as_u16() < 500 && status.as_u16() != 429 {
                        return Err(format!("客户端请求错误 ({}): {}", status, error_text));
                    }
                    continue;
                }
            }
            Err(e) => {
                tracing::warn!("⚠️ 网络请求异常: {} | 将进行下一次重试", e);
                if attempt == retry_limit - 1 { return Err(e.to_string()); }
                continue;
            }
        }
    }
    Err("重试耗尽".to_string())
}

fn extract_url(content: &str) -> Option<String> {
    if let Some(start) = content.find("](") {
        let sub = &content[start + 2..];
        if let Some(end) = sub.find(')') {
            let mut url = sub[..end].trim().to_string();
            if let Some(space_idx) = url.find(|c: char| c.is_whitespace()) {
                url = url[..space_idx].to_string();
            }
            return Some(url.trim_matches(|c| c == '"' || c == '\'').to_string());
        }
    }
    
    if let Some(start) = content.find("http") {
        let sub = &content[start..];
        let end = sub.find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == ')' || c == ']')
            .unwrap_or(sub.len());
        return Some(sub[..end].to_string());
    }
    
    None
}