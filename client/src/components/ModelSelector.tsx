import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Image, Zap, Shield, ChevronDown, Cpu, Cloud } from 'lucide-react';
import type { ModelInfo } from '../types';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

// 提供商配置
const PROVIDER_CONFIG: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  gemini: {
    name: 'Google',
    color: '#4285F4',
    icon: <Sparkles className="w-4 h-4" />
  },
  openai: {
    name: 'OpenAI',
    color: '#10A37F',
    icon: <Zap className="w-4 h-4" />
  },
  dashscope: {
    name: '阿里云',
    color: '#FF6A00',
    icon: <Cloud className="w-4 h-4" />
  },
  baidu: {
    name: '百度',
    color: '#2932E1',
    icon: <Shield className="w-4 h-4" />
  },
  local: {
    name: '本地',
    color: '#6366F1',
    icon: <Cpu className="w-4 h-4" />
  }
};

// 能力标签映射
const CAPABILITY_LABELS: Record<string, { label: string; color: string }> = {
  'text-to-image': { label: '文生图', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  'image-to-image': { label: '图生图', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  'negative-prompt': { label: '负向提示', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  'high-quality': { label: '高质量', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  'fast': { label: '快速', color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' },
  'prompt-enhancement': { label: '提示词美化', color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' }
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedModelInfo = models.find(m => m.id === selectedModel);
  const providerConfig = selectedModelInfo ? PROVIDER_CONFIG[selectedModelInfo.provider] : null;

  // 按提供商分组
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.provider || 'unknown';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  return (
    <div className="relative">
      {/* 主选择按钮 */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#1d1d1f] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {providerConfig && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: providerConfig.color }}
          >
            {providerConfig.icon}
          </div>
        )}
        <div className="text-left">
          <div className="text-[13px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {selectedModelInfo?.name || '选择模型'}
            {selectedModelInfo?.capabilities.includes('prompt-enhancement') && (
              <Sparkles className="w-3 h-3 text-amber-500" />
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {providerConfig?.name} · {selectedModelInfo?.supported_sizes[0]}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />

            {/* 模型列表面板 */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-[400px] max-h-[500px] overflow-y-auto bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl z-50 p-4"
            >
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">
                选择生图模型
              </div>

              {Object.entries(groupedModels).map(([provider, providerModels]) => {
                const config = PROVIDER_CONFIG[provider] || { name: provider, color: '#666', icon: <Cpu className="w-4 h-4" /> };
                return (
                  <div key={provider} className="mb-4">
                    {/* 提供商标题 */}
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <div
                        className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px]"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.icon}
                      </div>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                        {config.name}
                      </span>
                    </div>

                    {/* 模型列表 */}
                    <div className="space-y-1">
                      {providerModels.map((model) => (
                        <motion.button
                          key={model.id}
                          onClick={() => {
                            onSelect(model.id);
                            setIsExpanded(false);
                          }}
                          className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left ${
                            selectedModel === model.id
                              ? 'bg-black dark:bg-white text-white dark:text-black'
                              : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                          }`}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* 选中标记 */}
                          <div className="mt-0.5">
                            {selectedModel === model.id ? (
                              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                            )}
                          </div>

                          {/* 模型信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold">{model.name}</span>
                              {!model.enabled && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-500/20 rounded-full text-gray-500">
                                  未配置
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] opacity-70 mt-0.5 line-clamp-1">
                              {model.description}
                            </p>

                            {/* 能力标签 */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {model.capabilities.slice(0, 3).map((cap) => {
                                const capConfig = CAPABILITY_LABELS[cap];
                                if (!capConfig) return null;
                                return (
                                  <span
                                    key={cap}
                                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                                      selectedModel === model.id
                                        ? 'bg-white/20 text-white/90'
                                        : capConfig.color
                                    }`}
                                  >
                                    {capConfig.label}
                                  </span>
                                );
                              })}
                            </div>

                            {/* 支持尺寸 */}
                            <div className="flex items-center gap-1 mt-2 text-[9px] opacity-50">
                              <Image className="w-3 h-3" />
                              {model.supported_sizes.join(' · ')}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {models.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无可用模型</p>
                  <p className="text-xs mt-1">请先在设置中配置 API 密钥</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
