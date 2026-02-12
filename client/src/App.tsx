import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Settings, 
  Loader2, 
  Download, 
  Trash2, 
  Sliders, 
  History, 
  Sparkles,
  Maximize2,
  X,
  Moon,
  Sun,
  Archive,
  RefreshCw,
  Layers,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { TopBar } from './components/TopBar';
import { IdleAnimation } from './components/IdleAnimation';
import { SettingsPage } from './pages/SettingsPage';
import { AgentPage } from './pages/Agent.tsx';
import type { Task, AppConfig, GenerationGroup } from './types';

// --- Components ---

function GeneratorPage({
  tasks,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  aspectRatio,
  setAspectRatio,
  model,
  setModel,
  parallelCount,
  setParallelCount,
  baseImages,
  setBaseImages,
  startGeneration,
  onImageClick,
  isEnhancing,
  onEnhance,
  isDragging
}: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadedTasks, setLoadedTasks] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  return (
    <>
      <main 
        className="flex-1 p-8 overflow-y-auto transition-colors"
      >
        <div className="max-w-[1600px] mx-auto">
          {tasks.length === 0 ? (
            <div className="h-[65vh] flex flex-col items-center justify-center">
              <IdleAnimation />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-2">释放你的想象力</h2>
                <p className="text-[13px] text-gray-400 dark:text-gray-500 max-w-xs font-medium leading-relaxed mx-auto opacity-80">
                  输入您的绘图灵感，或者直接拖入多张参考图进行询问与生成。
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              <AnimatePresence mode="popLayout">
                {tasks.map((task: Task) => (
                  <motion.div 
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    key={task.id} 
                    className="bg-white dark:bg-[#1d1d1f] rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1"
                  >
                    <div className="aspect-square bg-[#f5f5f7] dark:bg-black/20 relative">
                      {task.status === 'completed' && task.resultUrl && !failedImages.has(task.id) ? (
                        <>
                          <img
                            src={task.resultUrl}
                            alt={task.prompt}
                            className={`w-full h-full object-cover cursor-zoom-in transition-opacity duration-700 ${loadedTasks.has(task.id) ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setLoadedTasks(prev => new Set(prev).add(task.id))}
                            onError={() => setFailedImages(prev => new Set(prev).add(task.id))}
                            onClick={() => onImageClick(task.resultUrl)}
                          />

                          {!loadedTasks.has(task.id) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 bg-[#f5f5f7] dark:bg-black/20">
                              <div className="relative mb-8">
                                <Loader2 className="w-14 h-14 text-black dark:text-white animate-spin opacity-20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[10px] font-black">100%</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                                <div className="bg-black dark:bg-white h-1 rounded-full w-full opacity-50"></div>
                              </div>
                              <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">正在加载图片...</p>
                            </div>
                          )}

                          {loadedTasks.has(task.id) && (
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                              <button
                                onClick={() => onImageClick(task.resultUrl)}
                                className="p-3 bg-white/90 backdrop-blur rounded-full text-black hover:bg-white transition-all shadow-xl hover:scale-110"
                              >
                                <Maximize2 className="w-5 h-5" />
                              </button>
                              <a
                                href={task.resultUrl}
                                download
                                className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-xl hover:scale-110"
                              >
                                <Download className="w-5 h-5" />
                              </a>
                            </div>
                          )}
                        </>
                      ) : (task.status === 'failed' || failedImages.has(task.id)) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl mb-4 text-red-400">
                            <Trash2 className="w-8 h-8" />
                          </div>
                          <p className="text-sm text-red-500 font-bold mb-2">
                            {failedImages.has(task.id) ? '图片加载失败' : '生成失败'}
                          </p>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-black/40 p-3 rounded-xl w-full line-clamp-4 border border-gray-100 dark:border-white/5 font-mono">
                            {failedImages.has(task.id) ? '无法从服务器获取图片资源，请检查网络或稍后重试。' : task.error}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-10">
                          <div className="relative mb-8">
                            <Loader2 className="w-14 h-14 text-black dark:text-white animate-spin opacity-20" />
                            <div className="absolute inset-0 flex items-center justify-center">
                               <span className="text-[10px] font-black">{Math.round(task.progress)}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-black dark:bg-white h-1 rounded-full transition-all duration-1000 ease-in-out" 
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <p className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7] line-clamp-2 leading-relaxed font-semibold mb-4 opacity-90">
                        {task.prompt}
                      </p>
                      <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-50 dark:border-white/5">
                        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 tracking-wider">
                          {task.aspect_ratio} • {new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                          task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                          task.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
                          'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 animate-pulse'
                        }`}>
                          {task.status === 'completed' ? 'Done' :
                           task.status === 'failed' ? 'Error' :
                           'Processing'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto space-y-3">
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: 20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 20 }}
                className="overflow-hidden bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block px-1">负向提示词</label>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="你不希望在图像中看到什么..."
                      className="w-full bg-gray-100/50 dark:bg-white/5 border-none rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all outline-none text-black dark:text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block px-1">图像比例</label>
                      <div className="flex gap-2 p-1 bg-gray-100/80 dark:bg-white/5 rounded-2xl">
                        {['1024x1024', '1280x720', '720x1280', '1216x896'].map(ratio => (
                          <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                              aspectRatio === ratio
                              ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                          >
                            {ratio === '1024x1024' ? '1:1' : ratio === '1280x720' ? '16:9' : ratio === '720x1280' ? '9:16' : '4:3'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {baseImages.length > 0 && (
            <div className="flex items-center gap-3 bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-3xl p-2.5 rounded-[1.5rem] border border-white/40 dark:border-white/10 w-fit shadow-xl max-w-full overflow-x-auto custom-scrollbar">
              <div className="flex gap-2.5">
                {baseImages.map((img: string, idx: number) => (
                  <div key={idx} className="relative shrink-0 group">
                    <img src={img} className="w-14 h-14 object-cover rounded-2xl shadow-inner border border-black/5 dark:border-white/5" alt={`Preview ${idx}`} />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setBaseImages((prev: string[]) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white/90 dark:bg-black/90 text-black dark:text-white rounded-full border border-black/5 dark:border-white/10 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  </div>
                ))}
              </div>
              <div className="pr-4 pl-2 border-l border-gray-200 dark:border-white/10 ml-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white leading-none whitespace-nowrap">{baseImages.length} 张参考图</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-tighter whitespace-nowrap font-medium">Images Attached</p>
              </div>
            </div>
          )}
          
          <div className={`bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-3xl p-2 rounded-full border border-white/40 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex items-center gap-2 group transition-all duration-500 focus-within:bg-white dark:focus-within:bg-[#1d1d1f] ${isDragging ? 'ring-2 ring-blue-500/50 bg-blue-50/50' : ''}`}>
            <div className="flex items-center pl-1">
              {isDragging && (
                <div className="p-2.5 text-blue-500 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 scale-110 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase animate-pulse">松开以添加</span>
                </div>
              )}
            </div>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startGeneration()}
              placeholder={isDragging ? "将图片拖放到此处..." : "描述您的创意，或拖入图片..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[#1d1d1f] dark:text-[#f5f5f7] py-3 px-2 text-sm font-medium outline-none placeholder:text-gray-400"
            />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEnhance}
              title="使用 Gemini-3-Flash 智能美化关键词"
              disabled={!prompt.trim() || isEnhancing}
              className="p-3 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all disabled:opacity-20 disabled:grayscale"
            >
              {isEnhancing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </motion.button>

            <div className="hidden md:flex items-center gap-2 bg-gray-100/80 dark:bg-white/5 p-1 rounded-full shrink-0">
              <div className="flex gap-1 relative">
                {[1, 2, 4, 8, 16].map(n => (
                  <button
                    key={n}
                    onClick={() => setParallelCount(n)}
                    className="relative z-10 w-8 h-8 flex items-center justify-center text-[10px] font-bold transition-all"
                  >
                    <span className={parallelCount === n ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600'}>
                      {n}
                    </span>
                    {parallelCount === n && (
                      <motion.div
                        layoutId="activeSegment"
                        className="absolute inset-0 bg-white dark:bg-white/10 rounded-full shadow-sm -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGeneration}
              disabled={!prompt.trim() && baseImages.length === 0}
              className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 disabled:grayscale p-3 rounded-full font-bold transition-all px-8 shadow-lg ml-1 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </footer>
    </>
  );
}

function HistoryPage({ history, onClear }: { history: GenerationGroup[], onClear: () => void }) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const downloadZip = async (timestamp: number) => {
    toast.promise(
      axios.get(`/api/export-zip?timestamp=${timestamp}`, { responseType: 'blob' })
        .then(response => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `images-${timestamp}.zip`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }),
      {
        loading: '正在打包压缩...',
        success: '打包下载成功！',
        error: '打包失败',
      }
    );
  };

  if (history.length === 0) {
    return (
      <main className="flex-1 p-8 flex flex-col items-center justify-center text-gray-400">
        <History className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">暂无生成历史</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-12">
        <div className="bg-black dark:bg-white p-3 rounded-2xl shadow-xl">
          <History className="text-white dark:text-black w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">创意库</h2>
          <p className="text-sm text-gray-400 font-medium">Capture your past inspirations</p>
        </div>
        <button 
          onClick={onClear}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
          清空历史
        </button>
      </div>

      <div className="space-y-16">
        {history.map((group, idx) => (
          <div key={idx} className="group/group">
            <div className="flex items-center gap-6 mb-6">
              <span className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em] whitespace-nowrap">
                {new Date(group.timestamp).toLocaleString()}
              </span>
              <div className="h-[1px] flex-1 bg-gray-100 dark:bg-white/5"></div>
              <button 
                onClick={() => downloadZip(group.timestamp)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1d1d1f] rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white border border-gray-100 dark:border-white/5 shadow-sm transition-all"
              >
                <Archive className="w-3.5 h-3.5" />
                打包下载
              </button>
            </div>
            
            <div className="bg-white dark:bg-[#1d1d1f] rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-50 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all duration-500">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-[#f5f5f7] mb-2 leading-relaxed">
                  {group.prompt}
                </h3>
                <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                  <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> {group.images.length} 张图片</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {group.images.map((url, imgIdx) => (
                  <div key={imgIdx} className="aspect-square rounded-3xl overflow-hidden relative group/img cursor-pointer border border-gray-50 dark:border-white/5 shadow-sm bg-[#f5f5f7] dark:bg-black/20">
                    <img
                      src={url}
                      alt={group.prompt}
                      className={`w-full h-full object-cover group-hover/img:scale-110 transition-all duration-700 ${loadedImages.has(url) ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setLoadedImages(prev => new Set(prev).add(url))}
                    />
                    {!loadedImages.has(url) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-black dark:text-white animate-spin opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <a href={url} download className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function AppContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<GenerationGroup[]>([]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1024x1024');
  const [model, setModel] = useState('gemini-3-pro-image');
  const [parallelCount, setParallelCount] = useState(4);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const location = useLocation();

  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounter.current++;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        setIsDragging(false);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const newImages = await Promise.all(imageFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }));

      setBaseImages((prev: string[]) => [...prev, ...newImages]);
      toast.success(`成功添加 ${imageFiles.length} 张参考图`);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchHistory();
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }

    // 全局兜底关闭逻辑
    const forceReset = () => {
      setIsDragging(false);
      dragCounter.current = 0;
    };

    // 使用捕获阶段 (true)，确保无论子组件是否 stopPropagation，都能重置状态
    window.addEventListener('drop', forceReset, true);
    window.addEventListener('dragend', forceReset, true);
    
    return () => {
      window.removeEventListener('drop', forceReset, true);
      window.removeEventListener('dragend', forceReset, true);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const pending = localStorage.getItem('pending_prompt');
    if (pending && location.pathname === '/') {
      setPrompt(pending);
      localStorage.removeItem('pending_prompt');
      toast.success('已从 YOLO模式 导入提示词');
    }
  }, [location.pathname]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/config');
      setConfig(response.data);
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data);
    } catch (error) {
      console.error('获取历史失败:', error);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('确定要清空所有创作历史吗？')) {
      try {
        await axios.delete('/api/history');
        setHistory([]);
        toast.success('历史已清空');
      } catch (error) {
        toast.error('清空历史失败');
      }
    }
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
    try {
      await axios.post('/api/config', newConfig);
      setConfig(newConfig);
      setIsConfigOpen(false);
      toast.success('配置已更新');
    } catch (error) {
      toast.error('更新配置失败');
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const response = await axios.post('/api/enhance-prompt', { prompt });
      setPrompt(response.data);
      toast.success('已使用 Gemini-3-Flash 增强提示词');
    } catch (error) {
      toast.error('增强提示词失败');
    } finally {
      setIsEnhancing(false);
    }
  };

  const startGeneration = async () => {
    if (!prompt.trim() && baseImages.length === 0) return;

    const timestamp = Date.now();
    const newTasks: Task[] = Array.from({ length: parallelCount }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      prompt: prompt || "根据参考图生成",
      negative_prompt: negativePrompt,
      aspect_ratio: aspectRatio,
      status: 'pending',
      progress: 0,
      timestamp: timestamp
    }));

    setTasks(prev => [...newTasks, ...prev]);
    const currentPrompt = prompt || "根据参考图生成";
    const currentNegative = negativePrompt;
    const currentImages = [...baseImages];
    const currentRatio = aspectRatio;
    
    setPrompt('');
    setNegativePrompt('');
    setBaseImages([]);

    let finishedCount = 0;
    newTasks.forEach(task => {
      executeTask(task, currentPrompt, currentNegative, currentImages, currentRatio, model, () => {
        finishedCount++;
        if (finishedCount === parallelCount) {
          fetchHistory();
          toast.success('生成任务已全部完成');
        }
      });
    });
  };

  const executeTask = async (
    task: Task, 
    taskPrompt: string, 
    taskNegative: string,
    taskImages: string[], 
    taskRatio: string,
    taskModel: string,
    onFinish: (url?: string) => void
  ) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'generating', progress: 10 } : t));

    try {
      const progressInterval = setInterval(() => {
        setTasks(prev => prev.map(t => {
          if (t.id === task.id && t.status === 'generating' && t.progress < 90) {
            return { ...t, progress: t.progress + Math.random() * 2 };
          }
          return t;
        }));
      }, 2000);

      const response = await axios.post('/v1/images/generations', {
        prompt: taskPrompt,
        negative_prompt: taskNegative,
        images: taskImages,
        model: taskModel,
        n: 1,
        size: taskRatio
      });

      clearInterval(progressInterval);

      const imageUrl = response.data.data[0].url;
      setTasks(prev => prev.map(t => t.id === task.id ? { 
        ...t, 
        status: 'completed', 
        progress: 100, 
        resultUrl: imageUrl 
      } : t));
      onFinish(imageUrl);
    } catch (error: any) {
      setTasks(prev => prev.map(t => t.id === task.id ? {
        ...t,
        status: 'failed',
        error: error.response?.data || error.message
      } : t));
      onFinish();
    }
  };

  const toggleTheme = (event: React.MouseEvent) => {
    const isAppearanceTransition =
      // @ts-ignore
      document.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isAppearanceTransition) {
      setIsDark(!isDark);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // @ts-ignore
    const transition = document.startViewTransition(async () => {
      setIsDark(!isDark);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: isDark
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <div 
      className="h-screen bg-[#f5f5f7] dark:bg-[#000000] flex flex-col font-sans text-[#1d1d1f] dark:text-[#f5f5f7] selection:bg-blue-100 transition-colors duration-700 relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toaster position="top-center" richColors theme={isDark ? 'dark' : 'light'} />

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 dark:bg-[#1d1d1f]/90 p-12 rounded-[3rem] shadow-2xl border-4 border-dashed border-blue-500/50 flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ImageIcon className="w-12 h-12 text-white animate-bounce" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-black dark:text-white mb-2">释放以添加图片</h2>
                <p className="text-blue-500 font-bold uppercase tracking-widest text-[10px]">Release to add reference images</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-2xl" alt="Fullscreen" />
              <div className="absolute top-4 right-4 flex gap-4">
                <a href={selectedImage} download className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all">
                  <Download className="w-6 h-6" />
                </a>
                <button onClick={() => setSelectedImage(null)} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopBar
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      <div className="flex-1 flex flex-col relative">
        <Routes>
          <Route path="/" element={
            <GeneratorPage 
              tasks={tasks}
              prompt={prompt}
              setPrompt={setPrompt}
              negativePrompt={negativePrompt}
              setNegativePrompt={setNegativePrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              model={model}
              setModel={setModel}
              parallelCount={parallelCount}
              setParallelCount={setParallelCount}
              baseImages={baseImages}
              setBaseImages={setBaseImages}
              startGeneration={startGeneration}
              onImageClick={setSelectedImage}
              isEnhancing={isEnhancing}
              onEnhance={handleEnhance}
              isDragging={isDragging}
            />
          } />
          <Route path="/history" element={<HistoryPage history={history} onClear={handleClearHistory} />} />
          <Route path="/settings" element={<SettingsPage config={config} onUpdateConfig={handleUpdateConfig} />} />
          <Route path="/agent" element={<AgentPage isDark={isDark} />} />
        </Routes>
      </div>

      {isConfigOpen && config && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1d1d1f] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-white/5"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
              <div>
                <h2 className="text-lg font-black text-gray-800 dark:text-white tracking-tight leading-none">系统配置</h2>
                <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">System Settings</p>
              </div>
              <button 
                onClick={() => setIsConfigOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">Gemini 代理端点</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2 text-xs font-bold focus:bg-white dark:focus:bg-black focus:border-blue-500 transition-all outline-none dark:text-white"
                    value={config.gemini_proxy_url}
                    onChange={(e) => setConfig({...config, gemini_proxy_url: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">API 授权密钥</label>
                    <input 
                      type="password" 
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2 text-xs font-bold focus:bg-white dark:focus:bg-black focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={config.api_key}
                      onChange={(e) => setConfig({...config, api_key: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">监听端口</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2 text-xs font-bold focus:bg-white dark:focus:bg-black focus:border-blue-500 transition-all outline-none dark:text-white"
                      value={config.port}
                      onChange={(e) => setConfig({...config, port: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5 mb-4 text-blue-500">
                    <Sliders className="w-3 h-3" />
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em]">性能参数</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">请求超时 (秒)</label>
                      <input 
                        type="number" 
                        className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2 text-xs font-bold focus:bg-white dark:focus:bg-black focus:border-blue-500 transition-all outline-none dark:text-white"
                        value={config.timeout}
                        onChange={(e) => setConfig({...config, timeout: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">最大重试</label>
                      <input 
                        type="number" 
                        className="w-full bg-gray-50 dark:bg-black/40 border border-transparent rounded-xl px-4 py-2 text-xs font-bold focus:bg-white dark:focus:bg-black focus:border-blue-500 transition-all outline-none dark:text-white"
                        value={config.retry_limit}
                        onChange={(e) => setConfig({...config, retry_limit: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 border-t border-gray-50 dark:border-white/5">
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-gray-600 transition-all"
              >
                取消
              </button>
              <button 
                onClick={() => handleUpdateConfig(config)}
                className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover:opacity-90 active:scale-95"
              >
                保存设置
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
