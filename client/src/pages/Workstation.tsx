import React, { useState } from 'react';
import {
  Send,
  Image as ImageIcon,
  Loader2,
  Download,
  Trash2,
  Sliders,
  Sparkles,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types';

interface GeneratorPageProps {
  tasks: Task[];
  prompt: string;
  setPrompt: (val: string) => void;
  negativePrompt: string;
  setNegativePrompt: (val: string) => void;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  model: string;
  setModel: (val: string) => void;
  parallelCount: number;
  setParallelCount: (val: number) => void;
  baseImages: string[];
  setBaseImages: React.Dispatch<React.SetStateAction<string[]>>;
  startGeneration: () => void;
  onImageClick: (url: string) => void;
  isEnhancing: boolean;
  onEnhance: () => void;
}

export const Workstation: React.FC<GeneratorPageProps> = ({
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
  onEnhance
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    const newImages = await Promise.all(imageFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }));

    setBaseImages((prev: string[]) => [...prev, ...newImages]);
  };

  return (
    <>
      <main
        className={`flex-1 p-8 overflow-y-auto transition-colors ${isDragging ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="max-w-[1600px] mx-auto">
          {tasks.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative mb-8"
              >
                {/* Atmosphere Layer */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -inset-24 bg-gradient-to-tr from-indigo-500/10 via-cyan-400/10 to-purple-500/10 rounded-full blur-[120px] opacity-50"
                />

                {/* Interference Layer */}
                <motion.div
                  animate={{
                    x: [0, 15, -15, 0],
                    y: [0, -10, 10, 0],
                    scale: [1, 1.2, 0.9, 1],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -inset-16 bg-gradient-to-br from-indigo-500/20 via-cyan-400/15 to-purple-500/20 rounded-full blur-[80px] opacity-40"
                />

                {/* Core Layer */}
                <div className="absolute -inset-10 bg-gradient-to-r from-indigo-500/30 via-cyan-400/20 to-purple-500/30 rounded-full blur-[40px] opacity-60 animate-pulse"></div>

                <div className="w-24 h-24 bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-3xl shadow-2xl flex items-center justify-center relative z-10 border border-white/20 dark:border-white/10 ring-1 ring-white/20">
                  <ImageIcon className="w-10 h-10 text-black dark:text-white opacity-80" />
                </div>
              </motion.div>
              <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white mb-3 text-center">释放你的想象力</h2>
              <p className="text-gray-400 dark:text-gray-500 text-center max-w-sm font-medium leading-relaxed">
                输入您的绘图灵感，或者直接拖入多张参考图进行询问与生成。
              </p>
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
                      {task.status === 'completed' && task.resultUrl ? (
                        <>
                          <img
                            src={task.resultUrl}
                            alt={task.prompt}
                            className="w-full h-full object-cover cursor-zoom-in"
                            onClick={() => onImageClick(task.resultUrl!)}
                          />
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                            <button
                              onClick={() => onImageClick(task.resultUrl!)}
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
                        </>
                      ) : task.status === 'failed' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl mb-4 text-red-400">
                            <Trash2 className="w-8 h-8" />
                          </div>
                          <p className="text-sm text-red-500 font-bold mb-2">生成失败</p>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-black/40 p-3 rounded-xl w-full line-clamp-4 border border-gray-100 dark:border-white/5 font-mono">
                            {task.error}
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
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-white/70 dark:bg-black/70 backdrop-blur-2xl p-3 rounded-2xl border border-white/50 dark:border-white/10 shadow-xl space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">负向提示词</label>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="你不希望在图像中看到什么..."
                      className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-black dark:focus:ring-white transition-all outline-none text-black dark:text-white"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">图像比例</label>
                      <div className="flex gap-1.5">
                        {['1024x1024', '1280x720', '720x1280', '1216x896'].map(ratio => (
                          <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${
                              aspectRatio === ratio
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                              : 'bg-white dark:bg-transparent text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-400'
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
            <div className="flex items-center gap-3 bg-white/70 dark:bg-black/70 backdrop-blur-2xl p-2 rounded-2xl border border-white/50 dark:border-white/10 w-fit shadow-2xl max-w-full overflow-x-auto custom-scrollbar">
              <div className="flex gap-2">
                {baseImages.map((img: string, idx: number) => (
                  <div key={idx} className="relative shrink-0">
                    <img src={img} className="w-12 h-12 object-cover rounded-lg shadow-inner" alt={`Preview ${idx}`} />
                    <button
                      onClick={() => setBaseImages((prev: string[]) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg flex items-center justify-center"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pr-3 pl-1 border-l border-gray-200 dark:border-white/10 ml-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white leading-none whitespace-nowrap">{baseImages.length} 张参考图</p>
                <p className="text-[8px] text-gray-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">Images Attached</p>
              </div>
            </div>
          )}

          <div className={`bg-white/70 dark:bg-black/70 backdrop-blur-2xl p-1.5 rounded-full border border-white/50 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex items-center gap-1.5 group transition-all duration-500 focus-within:shadow-[0_10px_40px_rgba(0,0,0,0.12)] focus-within:bg-white/90 dark:focus-within:bg-black/90 ${isDragging ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}>
            <div className="flex items-center">
              {isDragging && (
                <div className="p-2.5 text-blue-500 flex items-center gap-1">
                  <ImageIcon className="w-5 h-5 scale-125 animate-pulse" />
                  <span className="text-[10px] font-black uppercase animate-pulse">松开以添加</span>
                </div>
              )}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`p-2.5 rounded-full transition-all ${showAdvanced ? 'text-black dark:text-white bg-gray-100 dark:bg-white/10' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}
              >
                <Sliders className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startGeneration()}
              placeholder={isDragging ? "将图片拖放到此处..." : "描述您的创意，或拖入图片..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[#1d1d1f] dark:text-[#f5f5f7] py-2 px-1 text-sm font-medium outline-none"
            />

            <button
              onClick={onEnhance}
              disabled={!prompt.trim() || isEnhancing}
              className="p-2.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all disabled:opacity-30"
            >
              {isEnhancing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>

            <div className="hidden md:flex items-center gap-1 bg-[#f5f5f7] dark:bg-white/5 p-1 rounded-full border border-gray-200/50 dark:border-white/5 shrink-0">
              {[1, 2, 4, 8, 16].map(n => (
                <button
                  key={n}
                  onClick={() => setParallelCount(n)}
                  className={`w-7 h-7 rounded-full text-[9px] font-black transition-all ${
                    parallelCount === n
                      ? 'bg-white dark:bg-white/20 shadow-sm text-black dark:text-white'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={startGeneration}
              disabled={!prompt.trim() && baseImages.length === 0}
              className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-300 p-2.5 rounded-full font-bold transition-all px-6 shadow-lg active:scale-95 ml-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};
