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

export interface AppConfig {
  gemini_proxy_url: string;
  fallback_proxy_url: string | null;
  api_key: string;
  admin_token: string;
  storage_path: string;
  port: number;
  timeout: number;
  retry_limit: number;
}

export interface GenerationGroup {
  prompt: string;
  timestamp: number;
  images: string[];
}
