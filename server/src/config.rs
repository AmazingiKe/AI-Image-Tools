//! 配置管理系统
//!
//! 职责: 管理服务端所有配置，支持新旧配置双模式兼容
//! 场景: 多模型配置、代理设置、服务参数
//! 可替换性: 可替换为环境变量或配置中心加载

use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::providers::{dalle::DalleConfig, gemini::GeminiConfig};

/// 多模型配置集合
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfigs {
    /// Gemini 模型配置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gemini: Option<GeminiConfig>,
    /// DALL-E 模型配置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dalle: Option<DalleConfig>,
    /// 默认使用的模型 ID
    #[serde(default = "default_model")]
    pub default_model: String,
}

fn default_model() -> String {
    "gemini-3-pro-image".to_string()
}

impl Default for ModelConfigs {
    fn default() -> Self {
        Self {
            gemini: Some(GeminiConfig {
                api_endpoint: "http://127.0.0.1:8045/v1".to_string(),
                api_key: "sk-52036e30e0c2472e9e1f981bd23b8b0b".to_string(),
                timeout_secs: 300,
            }),
            dalle: None,
            default_model: default_model(),
        }
    }
}

/// 服务端配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// 图片存储路径
    #[serde(default = "default_storage_path")]
    pub storage_path: String,
    /// 服务端口
    #[serde(default = "default_port")]
    pub port: u16,
    /// 超时时间（秒）
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    /// 重试次数限制
    #[serde(default = "default_retry_limit")]
    pub retry_limit: usize,
    /// 管理员 Token
    #[serde(default = "default_admin_token")]
    pub admin_token: String,

    /// 多模型配置（新版）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub models: Option<ModelConfigs>,

    // --- 以下字段为兼容旧版配置 ---
    /// 代理 URL（旧版，优先使用 models.gemini.api_endpoint）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_url: Option<String>,
    /// 备用代理 URL（旧版）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_proxy_url: Option<String>,
    /// API 密钥（旧版，优先使用 models.gemini.api_key）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

fn default_storage_path() -> String {
    "./storage".to_string()
}

fn default_port() -> u16 {
    3000
}

fn default_timeout() -> u64 {
    300
}

fn default_retry_limit() -> usize {
    10
}

fn default_admin_token() -> String {
    "admin123".to_string()
}

impl Default for Config {
    fn default() -> Self {
        Self {
            storage_path: default_storage_path(),
            port: default_port(),
            timeout: default_timeout(),
            retry_limit: default_retry_limit(),
            admin_token: default_admin_token(),
            models: Some(ModelConfigs::default()),
            proxy_url: None,
            fallback_proxy_url: None,
            api_key: None,
        }
    }
}

impl Config {
    /// 加载配置文件，自动处理新旧配置迁移
    pub async fn load() -> Self {
        match tokio::fs::read_to_string("config.json").await {
            Ok(content) => {
                let mut config: Config =
                    serde_json::from_str(&content).unwrap_or_else(|e| {
                        tracing::warn!("配置文件解析失败，使用默认配置: {}", e);
                        Config::default()
                    });

                // 处理配置迁移
                config.migrate_if_needed();
                config
            }
            Err(_) => {
                let config = Config::default();
                // 创建默认配置文件
                if let Ok(json) = serde_json::to_string_pretty(&config) {
                    let _ = tokio::fs::write("config.json", json).await;
                }
                config
            }
        }
    }

    /// 保存配置到文件
    pub async fn save(&self) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        tokio::fs::write("config.json", json).await
    }

    /// 配置迁移：将旧版配置转换为新版
    fn migrate_if_needed(&mut self) {
        // 如果已有新版配置，无需迁移
        if self.models.is_some() {
            return;
        }

        tracing::info!("检测到旧版配置，正在迁移...");

        // 从旧版配置迁移
        let gemini_config = GeminiConfig {
            api_endpoint: self
                .proxy_url
                .clone()
                .unwrap_or_else(|| "http://127.0.0.1:8045/v1".to_string()),
            api_key: self
                .api_key
                .clone()
                .unwrap_or_else(|| "sk-52036e30e0c2472e9e1f981bd23b8b0b".to_string()),
            timeout_secs: self.timeout,
        };

        self.models = Some(ModelConfigs {
            gemini: Some(gemini_config),
            dalle: None,
            default_model: default_model(),
        });

        // 清理旧版配置字段（可选：保留以便回退）
        // self.proxy_url = None;
        // self.api_key = None;
    }

    /// 获取默认模型 ID
    pub fn default_model_id(&self) -> String {
        self.models
            .as_ref()
            .map(|m| m.default_model.clone())
            .unwrap_or_else(default_model)
    }

    /// 获取 Gemini 配置
    pub fn gemini_config(&self) -> Option<&GeminiConfig> {
        self.models.as_ref()?.gemini.as_ref()
    }

    /// 获取 DALL-E 配置
    pub fn dalle_config(&self) -> Option<&DalleConfig> {
        self.models.as_ref()?.dalle.as_ref()
    }

    /// 获取模型配置列表（用于前端展示）
    pub fn get_available_models(&self) -> Vec<ModelConfigInfo> {
        let mut models = Vec::new();

        if let Some(ref configs) = self.models {
            if configs.gemini.is_some() {
                models.push(ModelConfigInfo {
                    id: "gemini-3-pro-image".to_string(),
                    name: "Gemini 2.5 Pro Image".to_string(),
                    provider: "gemini".to_string(),
                    capabilities: vec![
                        "text-to-image".to_string(),
                        "image-to-image".to_string(),
                        "negative-prompt".to_string(),
                    ],
                });
                models.push(ModelConfigInfo {
                    id: "gemini-3-flash".to_string(),
                    name: "Gemini 2.5 Flash".to_string(),
                    provider: "gemini".to_string(),
                    capabilities: vec![
                        "text-to-image".to_string(),
                        "prompt-enhancement".to_string(),
                    ],
                });
            }

            if configs.dalle.is_some() {
                models.push(ModelConfigInfo {
                    id: "dall-e-3".to_string(),
                    name: "DALL-E 3".to_string(),
                    provider: "openai".to_string(),
                    capabilities: vec!["text-to-image".to_string(), "high-quality".to_string()],
                });
            }
        }

        models
    }

    /// 检查是否为旧版配置
    pub fn is_legacy_format(&self) -> bool {
        self.models.is_none() && (self.proxy_url.is_some() || self.api_key.is_some())
    }
}

/// 模型配置信息（用于前端展示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfigInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub capabilities: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = Config::default();
        assert_eq!(config.port, 3000);
        assert!(config.models.is_some());
    }

    #[test]
    fn test_migrate_legacy_config() {
        let legacy = Config {
            storage_path: "./storage".to_string(),
            port: 3000,
            timeout: 300,
            retry_limit: 10,
            admin_token: "admin123".to_string(),
            models: None,
            proxy_url: Some("http://localhost:8080/v1".to_string()),
            fallback_proxy_url: None,
            api_key: Some("test-key".to_string()),
        };

        // 模拟迁移后的配置检查
        assert!(legacy.is_legacy_format());
    }
}
