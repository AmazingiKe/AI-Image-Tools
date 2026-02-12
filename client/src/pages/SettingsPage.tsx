import React, { useState, useEffect } from 'react';
import {
  Sliders, Globe, Key, Monitor, Clock, RotateCcw, Save, ShieldCheck, Zap,
  Layers, Cpu, Cloud, Sparkles, Check, AlertCircle, Eye, EyeOff, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { NewAppConfig, ModelInfo } from '../types';

interface SettingsPageProps {
  config: NewAppConfig | null;
  onUpdateConfig: (newConfig: NewAppConfig) => Promise<void>;
  models: ModelInfo[];
}

// 提供商配置
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  gemini: <Sparkles className="w-5 h-5" />,
  openai: <Zap className="w-5 h-5" />,
  dashscope: <Cloud className="w-5 h-5" />,
  baidu: <ShieldCheck className="w-5 h-5" />,
  local: <Cpu className="w-5 h-5" />,
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ config, onUpdateConfig, models }) => {
  const [localConfig, setLocalConfig] = useState<NewAppConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'models' | 'system'>('models');

  useEffect(() => {
    if (config) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;
    setIsSaving(true);
    try {
      await onUpdateConfig(localConfig);
      toast.success('配置已保存');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!localConfig) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
  };

  const itemVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } };

  return (
    <motion.main
      initial="hidden" animate="visible" variants={containerVariants}
      className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full font-sans mb-20"
    >
      <header className="mb-8 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black dark:bg-white rounded-xl shadow-lg">
              <Sliders className="w-6 h-6 text-white dark:text-black" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-black dark:text-white tracking-tight">系统设置</h2>
              <p className="text-sm text-gray-500 font-medium opacity-80">配置模型 API 和系统参数</p>
            </div>
          </div>

          {/* 标签切换 */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('models')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'models'
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              模型配置
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'system'
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              系统设置
            </button>
          </div>
        </div>
      </header>

      {/* 模型配置页 */}
      {activeTab === 'models' && (
        <motion.div variants={containerVariants} className="space-y-6">
          {/* 默认模型选择 */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              <Check className="w-3.5 h-3.5" />
              默认模型
            </div>
            <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-4">
              <div className="grid grid-cols-2 gap-3">
                {models.filter(m => m.enabled).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setLocalConfig({
                      ...localConfig,
                      models: { ...localConfig.models, default_model: model.id }
                    })}
                    className={`flex items-center gap-3 p-4 rounded-2xl transition-all text-left ${
                      localConfig.models?.default_model === model.id
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      localConfig.models?.default_model === model.id
                        ? 'bg-white/20'
                        : 'bg-white dark:bg-black/20'
                    }`}>
                      {PROVIDER_ICONS[model.provider] || <Cpu className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{model.name}</div>
                      <div className="text-[10px] opacity-60 truncate">{model.id}</div>
                    </div>
                    {localConfig.models?.default_model === model.id && (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Gemini 配置 */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Google Gemini
            </div>
            <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">API 端点</label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="flex-1 bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.models?.gemini?.api_endpoint || localConfig.proxy_url || ''}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        models: {
                          ...localConfig.models,
                          gemini: { ...localConfig.models?.gemini, api_endpoint: e.target.value },
                          default_model: localConfig.models?.default_model || 'gemini-3-pro-image'
                        }
                      })}
                      placeholder="http://localhost:8045/v1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">API 密钥</label>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <input
                      type={showKeys.gemini ? 'text' : 'password'}
                      className="flex-1 bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.models?.gemini?.api_key || localConfig.api_key || ''}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        models: {
                          ...localConfig.models,
                          gemini: { ...localConfig.models?.gemini, api_key: e.target.value },
                          default_model: localConfig.models?.default_model || 'gemini-3-pro-image'
                        }
                      })}
                      placeholder="sk-..."
                    />
                    <button
                      onClick={() => toggleKeyVisibility('gemini')}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">超时 (秒)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.models?.gemini?.timeout_secs || localConfig.timeout || 300}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        models: {
                          ...localConfig.models,
                          gemini: { ...localConfig.models?.gemini, timeout_secs: Number(e.target.value) },
                          default_model: localConfig.models?.default_model || 'gemini-3-pro-image'
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* DALL-E 配置 */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              <Zap className="w-3.5 h-3.5 text-green-500" />
              OpenAI DALL-E
            </div>
            <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 space-y-4">
                {!localConfig.models?.dalle?.api_key && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      配置 OpenAI API 密钥以启用 DALL-E 模型
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">API 端点 (可选)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-green-500 transition-all outline-none dark:text-white"
                    value={localConfig.models?.dalle?.api_endpoint || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      models: {
                        ...localConfig.models,
                        dalle: { ...localConfig.models?.dalle, api_endpoint: e.target.value || 'https://api.openai.com/v1' },
                        default_model: localConfig.models?.default_model || 'gemini-3-pro-image'
                      }
                    })}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">API 密钥</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showKeys.dalle ? 'text' : 'password'}
                      className="flex-1 bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-green-500 transition-all outline-none dark:text-white"
                      value={localConfig.models?.dalle?.api_key || ''}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        models: {
                          ...localConfig.models,
                          dalle: e.target.value ? {
                            api_key: e.target.value,
                            api_endpoint: localConfig.models?.dalle?.api_endpoint || 'https://api.openai.com/v1',
                            timeout_secs: localConfig.models?.dalle?.timeout_secs || 120
                          } : undefined,
                          default_model: localConfig.models?.default_model || 'gemini-3-pro-image'
                        }
                      })}
                      placeholder="sk-..."
                    />
                    <button
                      onClick={() => toggleKeyVisibility('dalle')}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showKeys.dalle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}

      {/* 系统设置页 */}
      {activeTab === 'system' && (
        <motion.div variants={containerVariants} className="space-y-6">
          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              <Monitor className="w-3.5 h-3.5" />
              服务器配置
            </div>
            <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">监听端口</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.port}
                      onChange={(e) => setLocalConfig({ ...localConfig, port: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">存储路径</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.storage_path}
                      onChange={(e) => setLocalConfig({ ...localConfig, storage_path: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              <Zap className="w-3.5 h-3.5" />
              性能与重试
            </div>
            <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">请求超时 (秒)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.timeout}
                      onChange={(e) => setLocalConfig({ ...localConfig, timeout: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">最大重试次数</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={localConfig.retry_limit}
                      onChange={(e) => setLocalConfig({ ...localConfig, retry_limit: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100/50 dark:border-blue-500/10">
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/60 leading-relaxed">
                    在高并发场景下，适当增加重试次数可提高成功率，但会延长等待时间。
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}

      {/* 保存按钮 */}
      <motion.div variants={itemVariants} className="mt-8 sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-[1.5rem] text-[15px] font-black transition-all shadow-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <RotateCcw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          保存配置
        </button>
      </motion.div>
    </motion.main>
  );
};
