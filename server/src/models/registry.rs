//! 模型注册表
//!
//! 职责: 管理所有已注册的模型 Provider，提供模型发现和路由能力
//! 场景: 运行时动态管理模型，支持按能力和 ID 查找模型
//! 可替换性: 可替换为分布式注册中心实现，保持接口不变

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::{
    error::ModelError,
    provider::{ImageModelProvider, ModelCapability, ModelInfo},
};

/// 模型注册表
/// 线程安全，支持并发读写
pub struct ModelRegistry {
    /// 按模型 ID 索引的 Provider
    providers: RwLock<HashMap<String, Arc<dyn ImageModelProvider>>>,
    /// 按能力索引的模型 ID 列表
    capability_index: RwLock<HashMap<ModelCapability, HashSet<String>>>,
}

impl ModelRegistry {
    /// 创建新的注册表实例
    pub fn new() -> Self {
        Self {
            providers: RwLock::new(HashMap::new()),
            capability_index: RwLock::new(HashMap::new()),
        }
    }

    /// 注册模型 Provider
    pub async fn register(&self, provider: Arc<dyn ImageModelProvider>) {
        let info = provider.info();
        let model_id = info.id.clone();
        let model_name = info.name.clone();
        let capabilities: Vec<_> = info.capabilities.iter().copied().collect();

        // 更新能力索引
        {
            let mut index = self.capability_index.write().await;
            for cap in capabilities {
                index.entry(cap).or_default().insert(model_id.clone());
            }
        }

        // 注册 Provider
        let mut providers = self.providers.write().await;
        providers.insert(model_id, provider);

        tracing::info!("✅ 模型已注册: {}", model_name);
    }

    /// 取消注册模型
    pub async fn unregister(&self, model_id: &str) -> Option<Arc<dyn ImageModelProvider>> {
        let mut providers = self.providers.write().await;

        if let Some(provider) = providers.remove(model_id) {
            // 更新能力索引
            let mut index = self.capability_index.write().await;
            for cap in &provider.info().capabilities {
                if let Some(ids) = index.get_mut(cap) {
                    ids.remove(model_id);
                }
            }
            tracing::info!("🗑️ 模型已注销: {}", model_id);
            Some(provider)
        } else {
            None
        }
    }

    /// 获取指定 ID 的 Provider
    pub async fn get(&self, model_id: &str) -> Option<Arc<dyn ImageModelProvider>> {
        let providers = self.providers.read().await;
        providers.get(model_id).cloned()
    }

    /// 检查模型是否存在
    pub async fn contains(&self, model_id: &str) -> bool {
        let providers = self.providers.read().await;
        providers.contains_key(model_id)
    }

    /// 获取所有已注册模型的信息
    pub async fn list_models(&self) -> Vec<ModelInfo> {
        let providers = self.providers.read().await;
        providers
            .values()
            .map(|p| p.info().clone())
            .filter(|info| info.enabled)
            .collect()
    }

    /// 获取所有模型信息（包括禁用的）
    pub async fn list_all_models(&self) -> Vec<ModelInfo> {
        let providers = self.providers.read().await;
        providers.values().map(|p| p.info().clone()).collect()
    }

    /// 按能力查找模型
    pub async fn find_by_capability(&self, capability: ModelCapability) -> Vec<Arc<dyn ImageModelProvider>> {
        let index = self.capability_index.read().await;
        let providers = self.providers.read().await;

        index
            .get(&capability)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| providers.get(id).cloned())
                    .filter(|p| p.info().enabled)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// 获取支持特定能力的模型 ID 列表
    pub async fn list_models_by_capability(&self, capability: ModelCapability) -> Vec<String> {
        let index = self.capability_index.read().await;
        index
            .get(&capability)
            .map(|ids| ids.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// 获取注册表中的模型数量
    pub async fn count(&self) -> usize {
        let providers = self.providers.read().await;
        providers.len()
    }

    /// 清空所有模型
    pub async fn clear(&self) {
        let mut providers = self.providers.write().await;
        let mut index = self.capability_index.write().await;
        providers.clear();
        index.clear();
        tracing::info!("🧹 模型注册表已清空");
    }

    /// 获取默认模型（第一个启用的模型）
    pub async fn get_default_model(&self) -> Option<Arc<dyn ImageModelProvider>> {
        let providers = self.providers.read().await;
        providers
            .values()
            .find(|p| p.info().enabled)
            .cloned()
    }

    /// 路由请求到指定模型
    pub async fn route(
        &self,
        model_id: &str,
    ) -> Result<Arc<dyn ImageModelProvider>, ModelError> {
        let provider = self
            .get(model_id)
            .await
            .ok_or_else(|| ModelError::UnsupportedModel(model_id.to_string()))?;

        if !provider.info().enabled {
            return Err(ModelError::ServiceUnavailable(format!(
                "模型 {} 当前已禁用",
                model_id
            )));
        }

        Ok(provider)
    }
}

impl Default for ModelRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::provider::{UnifiedImageRequest, UnifiedImageResponse};

    struct MockProvider {
        info: ModelInfo,
    }

    #[async_trait::async_trait]
    impl ImageModelProvider for MockProvider {
        fn info(&self) -> &ModelInfo {
            &self.info
        }

        fn validate_request(&self, _req: &UnifiedImageRequest) -> Result<(), ModelError> {
            Ok(())
        }

        async fn generate(
            &self,
            _request: UnifiedImageRequest,
            _client: &reqwest::Client,
        ) -> Result<UnifiedImageResponse, ModelError> {
            Ok(UnifiedImageResponse {
                created: 0,
                data: vec![],
            })
        }

        async fn health_check(&self, _client: &reqwest::Client) -> Result<bool, ModelError> {
            Ok(true)
        }
    }
}
