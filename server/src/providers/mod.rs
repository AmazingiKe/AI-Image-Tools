//! Provider 实现模块
//!
//! 职责: 各生图模型 Provider 的具体实现
//! 场景: Gemini、DALL-E、通义万相等模型的适配器
//! 可替换性: 每个 Provider 独立实现，可单独替换升级

pub mod dalle;
pub mod gemini;

pub use dalle::DalleProvider;
pub use gemini::GeminiProvider;
