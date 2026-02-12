//! 模型错误类型定义
//!
//! 职责: 提供统一的错误类型，用于处理所有模型相关的错误
//! 场景: Provider 实现、请求验证、网络调用等场景的错误传递
//! 可替换性: 错误类型可扩展，支持添加新的错误变体

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use thiserror::Error;

/// 模型错误类型
#[derive(Error, Debug, Clone)]
pub enum ModelError {
    /// 请求验证失败
    #[error("请求验证失败: {0}")]
    ValidationError(String),

    /// 不支持的模型
    #[error("不支持的模型: {0}")]
    UnsupportedModel(String),

    /// 不支持的参数
    #[error("不支持的参数: {0}")]
    UnsupportedParameter(String),

    /// 网络请求失败
    #[error("网络请求失败: {0}")]
    NetworkError(String),

    /// 上游 API 错误
    #[error("上游 API 错误 [{status}]: {message}")]
    ApiError { status: u16, message: String },

    /// 响应解析失败
    #[error("响应解析失败: {0}")]
    ParseError(String),

    /// 配置错误
    #[error("配置错误: {0}")]
    ConfigError(String),

    /// 图片下载失败
    #[error("图片下载失败: {0}")]
    DownloadError(String),

    /// 存储错误
    #[error("存储错误: {0}")]
    StorageError(String),

    /// 超时
    #[error("请求超时")]
    Timeout,

    /// 速率限制
    #[error("触发速率限制，请稍后重试")]
    RateLimited,

    /// 内部错误
    #[error("内部错误: {0}")]
    InternalError(String),

    /// 服务不可用
    #[error("服务不可用: {0}")]
    ServiceUnavailable(String),
}

impl ModelError {
    /// 获取错误对应的 HTTP 状态码
    pub fn status_code(&self) -> StatusCode {
        match self {
            ModelError::ValidationError(_) => StatusCode::BAD_REQUEST,
            ModelError::UnsupportedModel(_) => StatusCode::BAD_REQUEST,
            ModelError::UnsupportedParameter(_) => StatusCode::BAD_REQUEST,
            ModelError::NetworkError(_) => StatusCode::BAD_GATEWAY,
            ModelError::ApiError { status, .. } => {
                StatusCode::from_u16(*status).unwrap_or(StatusCode::BAD_GATEWAY)
            }
            ModelError::ParseError(_) => StatusCode::BAD_GATEWAY,
            ModelError::ConfigError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ModelError::DownloadError(_) => StatusCode::BAD_GATEWAY,
            ModelError::StorageError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ModelError::Timeout => StatusCode::GATEWAY_TIMEOUT,
            ModelError::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            ModelError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ModelError::ServiceUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
        }
    }

    /// 获取错误代码（用于客户端识别）
    pub fn error_code(&self) -> &'static str {
        match self {
            ModelError::ValidationError(_) => "validation_error",
            ModelError::UnsupportedModel(_) => "unsupported_model",
            ModelError::UnsupportedParameter(_) => "unsupported_parameter",
            ModelError::NetworkError(_) => "network_error",
            ModelError::ApiError { .. } => "api_error",
            ModelError::ParseError(_) => "parse_error",
            ModelError::ConfigError(_) => "config_error",
            ModelError::DownloadError(_) => "download_error",
            ModelError::StorageError(_) => "storage_error",
            ModelError::Timeout => "timeout",
            ModelError::RateLimited => "rate_limited",
            ModelError::InternalError(_) => "internal_error",
            ModelError::ServiceUnavailable(_) => "service_unavailable",
        }
    }
}

impl IntoResponse for ModelError {
    fn into_response(self) -> axum::response::Response {
        let status = self.status_code();
        let body = Json(json!({
            "error": {
                "code": self.error_code(),
                "message": self.to_string(),
            }
        }));
        (status, body).into_response()
    }
}

impl From<reqwest::Error> for ModelError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            ModelError::Timeout
        } else if err.is_connect() {
            ModelError::NetworkError(format!("连接失败: {}", err))
        } else {
            ModelError::NetworkError(err.to_string())
        }
    }
}

impl From<serde_json::Error> for ModelError {
    fn from(err: serde_json::Error) -> Self {
        ModelError::ParseError(err.to_string())
    }
}

impl From<std::io::Error> for ModelError {
    fn from(err: std::io::Error) -> Self {
        ModelError::StorageError(err.to_string())
    }
}
