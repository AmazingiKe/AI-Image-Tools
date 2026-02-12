import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Terminal,
  Globe,
  Key,
  Copy,
  Check,
  Send,
  AlertCircle,
  BookOpen,
  Server,
  Sparkles,
  ChevronRight,
  Play
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import type { ModelInfo } from '../types';

interface ApiDocsProps {
  models: ModelInfo[];
}

// 代码示例
const CODE_EXAMPLES = {
  curl: `curl -X POST http://localhost:3000/v1/images/generations \\\
  -H "Content-Type: application/json" \\\
  -H "Authorization: Bearer your-api-key" \\\
  -d '{
    "prompt": "一只可爱的橘猫在樱花树下",
    "model": "gemini-3-pro-image",
    "size": "1024x1024",
    "n": 1
  }'`,

  python: `import requests

response = requests.post(
    "http://localhost:3000/v1/images/generations",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer your-api-key"
    },
    json={
        "prompt": "一只可爱的橘猫在樱花树下",
        "model": "gemini-3-pro-image",
        "size": "1024x1024",
        "n": 1
    }
)

data = response.json()
print(data['data'][0]['url'])`,

  javascript: `const response = await fetch('http://localhost:3000/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    prompt: '一只可爱的橘猫在樱花树下',
    model: 'gemini-3-pro-image',
    size: '1024x1024',
    n: 1
  })
});

const data = await response.json();
console.log(data.data[0].url);`,

  typescript: `interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
  negative_prompt?: string;
}

interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

const generateImage = async (
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> => {
  const response = await fetch(
    'http://localhost:3000/v1/images/generations',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.API_KEY}\`
      },
      body: JSON.stringify(request)
    }
  );
  return response.json();
};`
};

export const ApiDocs: React.FC<ApiDocsProps> = ({ models }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'auth' | 'endpoints' | 'examples'>('overview');
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'javascript' | 'typescript'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [testPrompt, setTestPrompt] = useState('');
  const [testModel, setTestModel] = useState(models[0]?.id || 'gemini-3-pro-image');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestApi = async () => {
    if (!testPrompt.trim()) {
      toast.error('请输入提示词');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post('/v1/images/generations', {
        prompt: testPrompt,
        model: testModel,
        size: '1024x1024',
        n: 1
      });
      setTestResult({
        success: true,
        data: response.data
      });
      toast.success('请求成功');
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data || error.message
      });
      toast.error('请求失败');
    } finally {
      setIsTesting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '概览', icon: BookOpen },
    { id: 'auth', label: '认证', icon: Key },
    { id: 'endpoints', label: '接口', icon: Server },
    { id: 'examples', label: '示例', icon: Code }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-black"
    >
      {/* 顶部导航 */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-white">API 文档</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">OpenAI 兼容的图像生成 API</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 概览页 */}
        {activeTab === 'overview' && (
          <motion.div variants={containerVariants} className="space-y-8">
            {/* 特性卡片 */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { icon: Globe, title: 'OpenAI 兼容', desc: '与 OpenAI DALL-E API 完全兼容，一键迁移' },
                { icon: Sparkles, title: '多模型支持', desc: `支持 ${models.length} 种生图模型，按需切换` },
                { icon: Terminal, title: 'RESTful API', desc: '简洁的 HTTP 接口，易于集成' }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* 快速开始 */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">快速开始</h3>
                <span className="text-xs text-gray-400 font-medium">5 分钟上手</span>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {[
                    { step: 1, title: '获取 API 密钥', desc: '在设置页面配置您的 API 密钥' },
                    { step: 2, title: '发送请求', desc: '使用 HTTP POST 请求 /v1/images/generations 端点' },
                    { step: 3, title: '获取图片', desc: '从响应中获取生成的图片 URL' }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-sm font-black shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 在线测试 */}
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Play className="w-6 h-6" />
                <h3 className="text-lg font-black">在线测试</h3>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="输入提示词测试 API..."
                    className="flex-1 bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-3 text-sm placeholder:text-white/50 text-white outline-none focus:bg-white/30"
                  />
                  <select
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value)}
                    className="bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id} className="text-black">{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleTestApi}
                    disabled={isTesting}
                    className="bg-white text-purple-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isTesting ? <Send className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                    测试
                  </button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl text-xs font-mono overflow-auto max-h-60 ${
                    testResult.success ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                  }`}>
                    <pre>{JSON.stringify(testResult.data || testResult.error, null, 2)}</pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 认证页 */}
        {activeTab === 'auth' && (
          <motion.div variants={containerVariants} className="space-y-6">
            <motion.div variants={itemVariants} className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                认证方式
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                所有 API 请求都需要在 HTTP Header 中包含 Authorization 字段。
              </p>
              <div className="bg-gray-900 rounded-2xl p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500">HTTP Header</span>
                  <button
                    onClick={() => handleCopy('Authorization: Bearer your-api-key')}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-green-400">Authorization</span>: <span className="text-yellow-400">Bearer</span> your-api-key
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">安全提示</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80">
                    请勿在客户端代码中暴露 API 密钥。建议通过后端服务代理请求，或使用环境变量存储密钥。
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 接口页 */}
        {activeTab === 'endpoints' && (
          <motion.div variants={containerVariants} className="space-y-6">
            <motion.div variants={itemVariants} className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">POST</span>
                  <code className="text-sm font-mono text-gray-700 dark:text-gray-300">/v1/images/generations</code>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">根据文本提示生成图像。</p>

                {/* 请求参数 */}
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">请求参数</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'prompt', type: 'string', required: true, desc: '图像生成的文本描述' },
                      { name: 'model', type: 'string', required: false, desc: '使用的模型 ID，默认 gemini-3-pro-image' },
                      { name: 'size', type: 'string', required: false, desc: '图像尺寸，如 1024x1024' },
                      { name: 'n', type: 'integer', required: false, desc: '生成数量，默认 1' },
                      { name: 'negative_prompt', type: 'string', required: false, desc: '负向提示词' }
                    ].map((param) => (
                      <div key={param.name} className="flex items-start gap-4 py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                        <code className="text-sm font-mono text-gray-900 dark:text-white w-32 shrink-0">{param.name}</code>
                        <div className="flex items-center gap-2 w-24 shrink-0">
                          <code className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{param.type}</code>
                          {param.required && <span className="text-[9px] text-red-500 font-bold">必需</span>}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{param.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 响应格式 */}
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">响应格式</h4>
                  <pre className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto">
{`{
  "created": 1704067200,
  "data": [
    {
      "url": "/images/img_abc123.png",
      "revised_prompt": "优化后的提示词"
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </motion.div>

            {/* 模型列表 */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">可用模型</h3>
              <div className="space-y-3">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">{model.id}</code>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{model.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {model.capabilities.slice(0, 2).map((cap) => (
                        <span key={cap} className="text-[9px] px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-400">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 示例页 */}
        {activeTab === 'examples' && (
          <motion.div variants={containerVariants} className="space-y-6">
            {/* 语言选择 */}
            <motion.div variants={itemVariants} className="flex items-center gap-2">
              {(['curl', 'python', 'javascript', 'typescript'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedLang === lang
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-white dark:bg-[#1d1d1f] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </motion.div>

            {/* 代码示例 */}
            <motion.div variants={itemVariants} className="bg-gray-900 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">example.{selectedLang === 'curl' ? 'sh' : selectedLang === 'python' ? 'py' : selectedLang === 'typescript' ? 'ts' : 'js'}</span>
                </div>
                <button
                  onClick={() => handleCopy(CODE_EXAMPLES[selectedLang])}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  复制
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto">
                <code>{CODE_EXAMPLES[selectedLang]}</code>
              </pre>
            </motion.div>

            {/* 更多示例链接 */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              {[
                { title: '带参考图的生成', desc: '使用 images 参数传入参考图', code: '"images": ["data:image/png;base64,..."]' },
                { title: '负向提示词', desc: '排除不需要的元素', code: '"negative_prompt": "模糊, 低质量"' },
                { title: '批量生成', desc: '一次生成多张图片', code: '"n": 4' },
                { title: '指定尺寸', desc: '控制输出图片比例', code: '"size": "1024x1792"' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{item.desc}</p>
                  <code className="text-[10px] bg-gray-100 dark:bg-black/50 px-2 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 block">
                    {item.code}
                  </code>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.main>
  );
};
