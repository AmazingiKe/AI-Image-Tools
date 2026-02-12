export interface Task {
  id: string;
  prompt: string;
  negative_prompt?: string;
  aspect_ratio: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  error?: string;
  timestamp: number;
}

// 旧版配置结构（向后兼容）
export interface AppConfig {
  proxy_url: string;
  fallback_proxy_url: string | null;
  api_key: string;
  admin_token: string;
  storage_path: string;
  port: number;
  timeout: number;
  retry_limit: number;
}

// 新版多模型配置结构
export interface ModelConfig {
  api_endpoint?: string;
  api_key: string;
  timeout_secs?: number;
}

export interface ModelConfigs {
  gemini?: ModelConfig;
  dalle?: ModelConfig;
  default_model: string;
}

export interface NewAppConfig {
  storage_path: string;
  port: number;
  timeout: number;
  retry_limit: number;
  admin_token: string;
  models?: ModelConfigs;
  // 旧版字段（兼容）
  proxy_url?: string;
  fallback_proxy_url?: string | null;
  api_key?: string;
}

// 模型信息
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  supported_sizes: string[];
  capabilities: string[];
  provider: string;
  enabled: boolean;
}

export interface GenerationGroup {
  prompt: string;
  timestamp: number;
  images: string[];
}
