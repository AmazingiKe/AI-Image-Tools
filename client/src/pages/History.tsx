import React from 'react';
import {
  History as HistoryIcon,
  Trash2,
  Archive,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import type { GenerationGroup } from '../types';

interface HistoryPageProps {
  history: GenerationGroup[];
  onClear: () => void;
}

export const History: React.FC<HistoryPageProps> = ({ history, onClear }) => {
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
        <HistoryIcon className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">暂无生成历史</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-12">
        <div className="bg-black dark:bg-white p-3 rounded-2xl shadow-xl">
          <HistoryIcon className="text-white dark:text-black w-6 h-6" />
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
                  <div key={imgIdx} className="aspect-square rounded-3xl overflow-hidden relative group/img cursor-pointer border border-gray-50 dark:border-white/5 shadow-sm">
                    <img src={url} alt={group.prompt} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
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
};
