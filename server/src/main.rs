//! AI Image Tools 服务端主入口
//!
//! 职责: 提供 OpenAI 兼容的图像生成 API，支持多模型动态切换
//! 场景: 支持 Gemini、DALL-E 等多种生图模型的统一接入
//! 架构: Provider 模式，模型可动态注册和替换

use axum::{
    extract::{Json, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use std::io::Write;
use std::path::Path;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::{cors::CorsLayer, services::ServeDir};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

mod config;
mod models;
mod providers;
mod storage;

use config::Config;
use models::{
    openai::{ImageGenerationRequest, ImageResponse},
    provider::{UnifiedImageRequest, ModelCapability},
    registry::ModelRegistry,
    ModelError,
};
use providers::{DalleProvider, GeminiProvider};

/// 应用状态
/// 包含配置、历史记录、模型注册表和 HTTP 客户端
#[derive(Clone)]
struct AppState {
    config: Arc<RwLock<Config>>,
    history: Arc<RwLock<Vec<GenerationGroup>>>,
    registry: Arc<ModelRegistry>,
    client: reqwest::Client,
}

/// 生成记录组
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct GenerationGroup {
    pub prompt: String,
    pub timestamp: u64,
    pub images: Vec<String>,
}

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,ai_image_tools=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 正在启动 AI Image Tools 服务端...");

    // 加载配置
    let config = Config::load().await;
    let port = config.port;
    let storage_path = config.storage_path.clone();

    // 加载历史记录
    let history = load_history().await;

    // 创建 HTTP 客户端
    let client = reqwest::Client::new();

    // 创建模型注册表
    let registry = Arc::new(ModelRegistry::new());

    // 初始化模型
    initialize_models(&config, &registry, &client).await;

    // 创建应用状态
    let state = AppState {
        config: Arc::new(RwLock::new(config)),
        history: Arc::new(RwLock::new(history)),
        registry,
        client,
    };

    // 确保存储目录存在
    let _ = tokio::fs::create_dir_all(&storage_path).await;

    // 构建路由
    let app = Router::new()
        // 核心 API
        .route("/v1/images/generations", post(generate_image))
        .route("/api/chat", post(chat_completions))
        // 管理 API
        .route("/api/config", get(get_config).post(update_config))
        .route("/api/models", get(list_models))
        .route("/api/history", get(get_history).delete(clear_history))
        .route("/api/enhance-prompt", post(enhance_prompt))
        .route("/api/export-zip", get(export_zip))
        // 健康检查
        .route("/health", get(health_check))
        // 静态文件服务
        .nest_service("/images", ServeDir::new(&storage_path))
        // 中间件
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(tower::limit::ConcurrencyLimitLayer::new(32))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // 启动服务
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await.unwrap();

    tracing::info!("✅ 服务端已启动: http://{}", addr);
    tracing::info!("📖 API 文档: http://{}/v1/images/generations", addr);

    axum::serve(listener, app).await.unwrap();
}

/// 初始化所有已配置的模型
async fn initialize_models(config: &Config, registry: &ModelRegistry, _client: &reqwest::Client) {
    tracing::info!("🔧 正在初始化模型...");

    let model_count_before = registry.count().await;

    // 注册 Gemini Provider
    if let Some(gemini_cfg) = config.gemini_config() {
        registry
            .register(Arc::new(GeminiProvider::new(gemini_cfg.clone())))
            .await;
        tracing::info!("✅ Gemini Provider 已注册");
    }

    // 注册 DALL-E Provider
    if let Some(dalle_cfg) = config.dalle_config() {
        registry
            .register(Arc::new(DalleProvider::new(dalle_cfg.clone())))
            .await;
        tracing::info!("✅ DALL-E Provider 已注册");
    }

    let model_count_after = registry.count().await;
    tracing::info!(
        "🎯 模型初始化完成 | 总计: {} 个",
        model_count_after - model_count_before
    );
}

// ==================== API Handlers ====================

/// 图像生成 API
async fn generate_image(
    State(state): State<AppState>,
    Json(payload): Json<ImageGenerationRequest>,
) -> impl IntoResponse {
    // 获取模型 ID（默认为配置中的默认模型）
    let model_id = payload.model.clone();
    let retry_limit = state.config.read().await.retry_limit;
    let storage_path = state.config.read().await.storage_path.clone();

    tracing::info!("📨 收到图像生成请求 | 模型: {} | 提示词: {}", model_id, payload.prompt);

    // 路由到对应 Provider
    let provider = match state.registry.route(&model_id).await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("❌ 模型路由失败: {}", e);
            return e.into_response();
        }
    };

    // 转换请求格式
    let unified_req: UnifiedImageRequest = payload.clone().into();

    // 执行生成（带重试机制）
    let mut last_error = None;
    for attempt in 0..retry_limit {
        if attempt > 0 {
            tracing::info!("🔄 第 {}/{} 次重试...", attempt + 1, retry_limit);
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }

        match provider.generate(unified_req.clone(), &state.client).await {
            Ok(mut unified_resp) => {
                // 下载并存储图片
                for item in &mut unified_resp.data {
                    if let Some(url) = &item.url {
                        match storage::download_and_save_image(url, &storage_path, &state.client).await {
                            Ok(filename) => {
                                item.url = Some(format!("/images/{}", filename));
                            }
                            Err(e) => {
                                tracing::warn!("⚠️ 图片下载失败: {}", e);
                            }
                        }
                    }
                }

                // 保存到历史记录
                save_generation_to_history(&state, &payload, &unified_resp).await;

                // 转换为 OpenAI 格式响应
                let response: ImageResponse = unified_resp.into();
                return (StatusCode::OK, Json(response)).into_response();
            }
            Err(e) => {
                tracing::warn!("⚠️ 生成失败 (尝试 {}/{}): {}", attempt + 1, retry_limit, e);
                last_error = Some(e);

                // 4xx 错误不重试
                if let Some(ref err) = last_error {
                    if let ModelError::ApiError { status, .. } = err {
                        if *status >= 400 && *status < 500 && *status != 429 {
                            break;
                        }
                    }
                }
            }
        }
    }

    // 所有重试都失败了
    if let Some(err) = last_error {
        tracing::error!("❌ 图像生成最终失败: {}", err);
        err.into_response()
    } else {
        ModelError::InternalError("未知错误".to_string()).into_response()
    }
}

/// 保存生成记录到历史
async fn save_generation_to_history(
    state: &AppState,
    request: &ImageGenerationRequest,
    response: &models::provider::UnifiedImageResponse,
) {
    let images: Vec<String> = response.data.iter()
        .filter_map(|d| d.url.clone())
        .collect();

    if !images.is_empty() {
        let mut history = state.history.write().await;
        history.insert(
            0,
            GenerationGroup {
                prompt: request.prompt.clone(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    * 1000,
                images,
            },
        );

        // 限制历史记录数量
        if history.len() > 100 {
            history.truncate(100);
        }

        let _ = save_history(&history).await;
    }
}

/// 获取可用模型列表
async fn list_models(State(state): State<AppState>) -> impl IntoResponse {
    let models = state.registry.list_models().await;
    Json(models)
}

/// 获取配置
async fn get_config(State(state): State<AppState>) -> impl IntoResponse {
    let config = state.config.read().await;
    Json(config.clone())
}

/// 更新配置
async fn update_config(
    State(state): State<AppState>,
    Json(new_config): Json<Config>,
) -> impl IntoResponse {
    // 验证配置
    if new_config.port == 0 {
        return (
            StatusCode::BAD_REQUEST,
            "端口号不能为 0",
        )
            .into_response();
    }

    let mut config = state.config.write().await;
    *config = new_config;

    // 保存到文件
    match config.save().await {
        Ok(_) => {
            tracing::info!("💾 配置已更新并保存");
            StatusCode::OK.into_response()
        }
        Err(e) => {
            tracing::error!("❌ 配置保存失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("配置保存失败: {}", e),
            )
                .into_response()
        }
    }
}

/// 获取历史记录
async fn get_history(State(state): State<AppState>) -> impl IntoResponse {
    let history = state.history.read().await;
    Json(history.clone())
}

/// 清空历史记录
async fn clear_history(State(state): State<AppState>) -> impl IntoResponse {
    let mut history = state.history.write().await;
    history.clear();
    let _ = save_history(&history).await;
    StatusCode::OK
}

/// 健康检查
async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let model_count = state.registry.count().await;
    Json(serde_json::json!({
        "status": "ok",
        "models": model_count,
    }))
}

// ==================== Chat Completions API ====================

#[derive(Deserialize)]
struct ChatRequest {
    messages: Vec<models::openai::ChatMessage>,
    model: Option<String>,
}

/// 聊天补全 API（转发到上游代理）
async fn chat_completions(
    State(state): State<AppState>,
    Json(payload): Json<ChatRequest>,
) -> impl IntoResponse {
    // 获取 Gemini 配置用于聊天补全
    let (api_endpoint, api_key) = {
        let config = state.config.read().await;
        match config.gemini_config() {
            Some(cfg) => (cfg.api_endpoint.clone(), cfg.api_key.clone()),
            None => {
                return (
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Gemini 配置不可用",
                )
                    .into_response();
            }
        }
    };

    // 构建 URL
    let url = if api_endpoint.contains("/v1") {
        format!("{}/chat/completions", api_endpoint.trim_end_matches('/'))
    } else {
        format!("{}/v1/chat/completions", api_endpoint.trim_end_matches('/'))
    };

    let model = payload
        .model
        .unwrap_or_else(|| "gemini-3-flash".to_string());

    let chat_payload = serde_json::json!({
        "model": model,
        "messages": payload.messages,
    });

    match state
        .client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_payload)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(data) => (StatusCode::OK, Json(data)).into_response(),
                    Err(e) => {
                        tracing::error!("解析聊天响应失败: {}", e);
                        (StatusCode::BAD_GATEWAY, "解析响应失败").into_response()
                    }
                }
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                tracing::error!("聊天请求失败 ({}): {}", status, error_text);
                (
                    StatusCode::BAD_GATEWAY,
                    format!("上游请求失败: {}", status),
                )
                    .into_response()
            }
        }
        Err(e) => {
            tracing::error!("连接代理失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
                .into_response()
        }
    }
}

// ==================== Prompt Enhancement ====================

#[derive(Deserialize)]
struct EnhanceRequest {
    prompt: String,
}

/// 提示词美化 API
async fn enhance_prompt(
    State(state): State<AppState>,
    Json(payload): Json<EnhanceRequest>,
) -> impl IntoResponse {
    // 获取 Gemini 配置
    let (api_endpoint, api_key) = {
        let config = state.config.read().await;
        match config.gemini_config() {
            Some(cfg) => (cfg.api_endpoint.clone(), cfg.api_key.clone()),
            None => {
                return (
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Gemini 配置不可用",
                )
                    .into_response();
            }
        }
    };

    let url = if api_endpoint.contains("/v1") {
        format!("{}/chat/completions", api_endpoint.trim_end_matches('/'))
    } else {
        format!("{}/v1/chat/completions", api_endpoint.trim_end_matches('/'))
    };

    let chat_payload = serde_json::json!({
        "model": "gemini-3-flash",
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

    match state
        .client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_payload)
        .send()
        .await
    {
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
                        (StatusCode::BAD_GATEWAY, "响应格式错误").into_response()
                    }
                    Err(e) => {
                        tracing::error!("解析美化响应失败: {}", e);
                        (StatusCode::BAD_GATEWAY, "解析响应失败").into_response()
                    }
                }
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                tracing::error!("美化请求失败 ({}): {}", status, error_text);
                (StatusCode::BAD_GATEWAY, "请求失败").into_response()
            }
        }
        Err(e) => {
            tracing::error!("连接代理失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

// ==================== Export ZIP ====================

#[derive(Deserialize)]
struct ExportZipQuery {
    timestamp: u64,
}

/// 导出 ZIP 文件
async fn export_zip(
    State(state): State<AppState>,
    Query(query): Query<ExportZipQuery>,
) -> impl IntoResponse {
    let history = state.history.read().await;
    let group = history.iter().find(|g| g.timestamp == query.timestamp);

    if let Some(group) = group {
        let storage_path = state.config.read().await.storage_path.clone();

        let mut buf = Vec::new();
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);

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
            .header(
                "Content-Disposition",
                format!("attachment; filename=\"images-{}.zip\"", query.timestamp),
            )
            .body(axum::body::Body::from(buf))
            .unwrap()
    } else {
        (StatusCode::NOT_FOUND, "历史记录不存在").into_response()
    }
}

// ==================== Helper Functions ====================

async fn load_history() -> Vec<GenerationGroup> {
    match tokio::fs::read_to_string("history.json").await {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

async fn save_history(history: &[GenerationGroup]) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(history)?;
    tokio::fs::write("history.json", json).await
}
