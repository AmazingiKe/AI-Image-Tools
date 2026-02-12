import React, { useState, useEffect } from 'react';
import { Sliders, Globe, Key, Monitor, Clock, RotateCcw, Save, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AppConfig } from '../types';

interface SettingsPageProps {
  config: AppConfig | null;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ config, onUpdateConfig }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    } finally {
      setIsSaving(false);
    }
  };

  if (!localConfig) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex-1 p-8 overflow-y-auto max-w-3xl mx-auto w-full font-sans mb-20"
    >
      <header className="mb-12 px-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-black dark:bg-white rounded-xl shadow-lg">
            <Sliders className="w-6 h-6 text-white dark:text-black" />
          </div>
          <h2 className="text-3xl font-black text-black dark:text-white tracking-tight">系统设置</h2>
        </div>
        <p className="text-sm text-gray-500 font-medium opacity-80">配置您的创作环境，优化 API 调用与性能表现。</p>
      </header>

      <div className="space-y-10">
        {/* Connection Group */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3.5 h-3.5" />
            连接与服务
          </div>
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            {/* Row 1 */}
            <div className="flex items-center px-6 py-5 gap-4 border-b border-gray-50/50 dark:border-white/5 group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 border border-gray-200/50 dark:border-white/10">
                <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-black dark:text-white">Gemini 代理端点</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-medium">指定图片生成的 API 转发地址</div>
              </div>
              <input
                type="text"
                placeholder="https://..."
                className="w-1/2 bg-gray-100/50 dark:bg-white/5 border-2 border-transparent rounded-xl px-4 py-2.5 text-[13px] font-semibold focus:border-gray-500/20 focus:bg-white dark:focus:bg-black transition-all outline-none text-right dark:text-gray-200"
                value={localConfig.gemini_proxy_url}
                onChange={(e) => setLocalConfig({...localConfig, gemini_proxy_url: e.target.value})}
              />
            </div>
            {/* Row 2 */}
            <div className="flex items-center px-6 py-5 gap-4 border-b border-gray-50/50 dark:border-white/5 group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 border border-gray-200/50 dark:border-white/10">
                <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-black dark:text-white">API 授权密钥</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-medium">用于验证请求的身份凭证</div>
              </div>
              <input
                type="password"
                placeholder="sk-..."
                className="w-1/2 bg-gray-100/50 dark:bg-white/5 border-2 border-transparent rounded-xl px-4 py-2.5 text-[13px] font-semibold focus:border-gray-500/20 focus:bg-white dark:focus:bg-black transition-all outline-none text-right dark:text-gray-200"
                value={localConfig.api_key}
                onChange={(e) => setLocalConfig({...localConfig, api_key: e.target.value})}
              />
            </div>
            {/* Row 3 */}
            <div className="flex items-center px-6 py-5 gap-4 group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 border border-gray-200/50 dark:border-white/10">
                <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-black dark:text-white">监听端口</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-medium">本地服务器运行的端口号</div>
              </div>
              <input
                type="number"
                className="w-24 bg-gray-100/50 dark:bg-white/5 border-2 border-transparent rounded-xl px-4 py-2.5 text-[13px] font-semibold focus:border-gray-500/20 focus:bg-white dark:focus:bg-black transition-all outline-none text-right dark:text-gray-200"
                value={localConfig.port}
                onChange={(e) => setLocalConfig({...localConfig, port: Number(e.target.value)})}
              />
            </div>
          </div>
        </motion.section>

        {/* Performance Group */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 px-4 mb-4 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
            <Zap className="w-3.5 h-3.5" />
            性能与重试
          </div>
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center px-6 py-5 gap-4 border-b border-gray-50/50 dark:border-white/5 group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 border border-gray-200/50 dark:border-white/10">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-black dark:text-white">请求超时</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-medium">等待响应的最大秒数</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-20 bg-gray-100/50 dark:bg-white/5 border-2 border-transparent rounded-xl px-4 py-2.5 text-[13px] font-semibold focus:border-gray-500/20 focus:bg-white dark:focus:bg-black transition-all outline-none text-right dark:text-gray-200"
                  value={localConfig.timeout}
                  onChange={(e) => setLocalConfig({...localConfig, timeout: Number(e.target.value)})}
                />
                <span className="text-[11px] font-bold text-gray-400">SEC</span>
              </div>
            </div>
            <div className="flex items-center px-6 py-5 gap-4 group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 border border-gray-200/50 dark:border-white/10">
                <RotateCcw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-black dark:text-white">最大重试次数</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-medium">网络异常时的自动重试策略</div>
              </div>
              <input
                type="number"
                className="w-20 bg-gray-100/50 dark:bg-white/5 border-2 border-transparent rounded-xl px-4 py-2.5 text-[13px] font-semibold focus:border-gray-500/20 focus:bg-white dark:focus:bg-black transition-all outline-none text-right dark:text-gray-200"
                value={localConfig.retry_limit}
                onChange={(e) => setLocalConfig({...localConfig, retry_limit: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="px-6 py-4 mt-2">
             <div className="flex gap-2 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100/50 dark:border-blue-500/10">
               <div className="text-blue-500">💡</div>
               <p className="text-[11px] text-blue-600/80 dark:text-blue-400/60 leading-relaxed font-medium">
                在高并发或网络波动的场景下，适当增加重试次数可显著提高图片生成的成功率，但会相应延长最终的等待时间。
               </p>
             </div>
          </div>
        </motion.section>

        <motion.div variants={itemVariants} className="pt-6 px-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-[1.5rem] text-[15px] font-black transition-all shadow-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {isSaving ? (
              <RotateCcw className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5 group-hover:animate-bounce" />
            )}
            应用并保存配置
          </button>
        </motion.div>
      </div>
    </motion.main>
  );
};
