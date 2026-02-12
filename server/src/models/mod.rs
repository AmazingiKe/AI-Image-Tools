//! 模型抽象层模块
//!
//! 职责: 提供多模型支持的统一接口和数据结构
//! 场景: 支持多种生图模型的动态接入和统一管理

pub mod error;
pub mod openai;
pub mod provider;
pub mod registry;

// 重新导出常用类型
pub use error::ModelError;
pub use provider::{ImageModelProvider, ModelCapability, ModelInfo, UnifiedImageRequest, UnifiedImageResponse};
pub use registry::ModelRegistry;
