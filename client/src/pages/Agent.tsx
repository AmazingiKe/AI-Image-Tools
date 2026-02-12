import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  User,
  Bot,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  X,
  Copy,
  ExternalLink,
  Layout,
  Maximize2,
  Download,
  Upload,
  ImageIcon,
  Wand2
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Tldraw, useEditor, createShapeId, AssetRecordType, exportToBlob, toRichText } from 'tldraw';
import type { TLUiOverrides } from 'tldraw';
import 'tldraw/tldraw.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AgentPageProps {
  isDark?: boolean;
}

export function AgentPage({ isDark = false }: AgentPageProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are Gemini YOLO, a powerful AI assistant in YOLO Mode. You help users with creative tasks, brainstorming, and daring marketing ideas.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 状态：是否正在生成图片
  const [isGenerating, setIsGenerating] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const projectToCanvas = useCallback((content: string, role: string) => {
    if (!editor) return;

    const id = createShapeId();
    editor.createShapes([
      {
        id,
        type: 'text',
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
        props: {
          richText: toRichText(content.length > 200 ? content.substring(0, 200) + '...' : content),
          font: 'sans',
          size: 'm',
          color: role === 'user' ? 'blue' : 'black',
        },
      },
    ]);
    
    // If it's a long message, maybe also create a note
    if (content.length > 200) {
        editor.createShapes([
            {
                id: createShapeId(),
                type: 'note',
                x: Math.random() * 400 + 300,
                y: Math.random() * 400 + 300,
                props: {
                    richText: toRichText(content),
                    color: role === 'user' ? 'blue' : 'grey',
                }
            }
        ]);
    }
  }, [editor]);

  const syncToWorkstation = useCallback(() => {
    if (!editor) return;

    const shapes = editor.getCurrentPageShapes();
    const texts = shapes
      .filter((s: any) => s.type === 'text' || s.type === 'note')
      .map((s: any) => {
        if (s.props.richText) {
            try {
                return editor.getShapeUtil(s).getText(s);
            } catch (e) {
                return s.props.text || '';
            }
        }
        return s.props.text || '';
      })
      .join('\n\n');

    if (!texts) {
      toast.error('画布上没有可用的灵感文本');
      return;
    }

    localStorage.setItem('pending_prompt', texts);
    navigate('/');
    toast.success('已将画布上所有灵感打包发送到工作台');
  }, [editor, navigate]);

  // 导出画布为 PNG
  const exportCanvas = useCallback(async () => {
    if (!editor) return;
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      toast.error('画布为空');
      return;
    }
    try {
      const shapeArray = Array.from(shapeIds);
      const blob = await exportToBlob(editor, {
        format: 'png',
        ids: shapeArray,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `canvas-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('画布已导出');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  }, [editor]);

  // 发送画布到生成器（保存为参考图）
  const sendToGenerator = useCallback(async (ids?: any) => {
    if (!editor) return;
    const shapeIds = ids || editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      toast.error('画布为空');
      return;
    }
    try {
      const shapeArray = Array.from(shapeIds);
      const blob = await exportToBlob(editor, {
        format: 'png',
        ids: shapeArray,
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem('canvas_reference_image', reader.result as string);
        localStorage.setItem('canvas_reference_timestamp', Date.now().toString());
        toast.success('已添加到参考图，请前往工作台使用');
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('发送失败:', error);
      toast.error('发送失败');
    }
  }, [editor]);

  // 直接从画布生成图片（核心功能）
  const generateFromCanvas = useCallback(async (ids?: any) => {
    if (!editor || typeof editor.getCurrentPageShapeIds !== 'function') {
      toast.error('画布未初始化，请稍候再试');
      return;
    }

    let shapeIds = ids || editor.getCurrentPageShapeIds();
    if (!shapeIds || shapeIds.size === 0) {
      toast.error('画布内容为空');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('正在从画布生成图片...');

    try {
      // 1. 导出画布为 base64
      const shapeArray = Array.from(shapeIds);
      const blob = await exportToBlob(editor, {
        format: 'png',
        ids: shapeArray,
      });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 2. 提取画布上的文本作为提示词
      const shapes = editor.getCurrentPageShapes();
      const textContent = shapes
        .filter((s: any) => s.type === 'text' || s.type === 'note')
        .map((s: any) => {
            if (s.props.richText) {
                // If it's richText, we try to extract text from it. 
                // In tldraw, richText often has a 'text' property or can be converted.
                // A common way is to use editor.getShapeUtil(s).getText(s)
                try {
                    return editor.getShapeUtil(s).getText(s);
                } catch (e) {
                    return s.props.text || '';
                }
            }
            return s.props.text || '';
        })
        .filter((t: string) => t.trim())
        .join(', ');

      const prompt = textContent || '根据这张草图生成一张精美的图片，保持原有的构图和风格';

      // 3. 调用图片生成 API
      const response = await axios.post('/v1/images/generations', {
        prompt: prompt,
        model: 'gemini-2.0-flash-exp-image-generation',
        n: 1,
        size: '1024x1024',
        image: base64  // 发送画布图片作为参考
      });

      // 4. 处理生成结果
      if (response.data?.data?.[0]?.url) {
        const imageUrl = response.data.data[0].url;

        // 获取图片并添加到画布
        const imgResponse = await fetch(imageUrl);
        const imgBlob = await imgResponse.blob();
        const imgDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imgBlob);
        });

        // 获取图片尺寸
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = imgDataUrl;
        });

        const maxSize = 500;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width *= scale;
          height *= scale;
        }

        // 添加到画布
        const assetId = AssetRecordType.createId();
        editor.createAssets([{
          id: assetId,
          type: 'image',
          typeName: 'asset',
          props: {
            name: `generated-${Date.now()}.png`,
            src: imgDataUrl,
            w: width,
            h: height,
            mimeType: 'image/png',
            isAnimated: false,
          },
          meta: {},
        }]);

        const viewport = editor.getViewportScreenBounds();
        const center = editor.screenToPage({ x: viewport.width / 2, y: viewport.height / 2 });

        editor.createShape({
          type: 'image',
          x: center.x + 100,
          y: center.y - height / 2,
          props: { assetId, w: width, h: height },
        });

        toast.success('图片生成成功！', { id: toastId });
      } else {
        throw new Error('生成响应格式错误');
      }
    } catch (error: any) {
      console.error('生成失败:', error);
      const errorMsg = error.response?.data || error.message || '未知错误';
      toast.error(`生成失败: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [editor]);

  // 导入图片到画布
  const importImage = useCallback(async (file: File) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;

      // 获取图片尺寸
      const img = new Image();
      img.onload = () => {
        const maxSize = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width *= scale;
          height *= scale;
        }

        const assetId = AssetRecordType.createId();
        editor.createAssets([{
          id: assetId,
          type: 'image',
          typeName: 'asset',
          props: {
            name: file.name,
            src: dataUrl,
            w: width,
            h: height,
            mimeType: file.type,
            isAnimated: false,
          },
          meta: {},
        }]);

        const viewport = editor.getViewportScreenBounds();
        const center = editor.screenToPage({ x: viewport.width / 2, y: viewport.height / 2 });

        editor.createShape({
          type: 'image',
          x: center.x - width / 2,
          y: center.y - height / 2,
          props: { assetId, w: width, h: height },
        });
        toast.success('图片已导入');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      importImage(file);
    }
    e.target.value = '';
  };

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (!editor) return;
    if (window.confirm('确定要清空画布吗？')) {
      editor.selectAll().deleteShapes(editor.getSelectedShapeIds());
      toast.success('画布已清空');
    }
  }, [editor]);

  const uiOverrides = React.useMemo<TLUiOverrides>(() => ({
    translations: {
      'en': {
        'arrow-kind-style.arc': '弧线',
        'arrow-kind-style.elbow': '折线',
        'tool.rich-text-toolbar-title': '富文本工具栏',
        'tool.rich-text-orderedList': '有序列表',
        'a11y.status': '状态',
        'a11y.select-shape': '选择图形',
        'a11y.select-shape-direction': '选择图形方向',
        'a11y.enter-leave-container': '进入/离开容器',
        'a11y.repeat-shape': '重复图形',
        'a11y.move-shape': '移动图形',
        'a11y.move-shape-faster': '快速移动图形',
        'a11y.enlarge-shape': '放大图形',
        'a11y.shrink-shape': '缩小图形',
        'a11y.pan-camera': '平移视角',
        'a11y.adjust-shape-styles': '调整图形样式',
        'people-menu.avatar-color': '头像颜色',
        'edit-link-dialog.external-link': '外部链接',
        'shortcuts-dialog.a11y': '辅助功能快捷键',
        'shortcuts-dialog.text-formatting': '文本格式快捷键',
        'navigation-zone.title': '导航区域',
        'navigation-zone.minimap': '小地图',
        'toast.success': '成功',
        'toast.info': '信息',
        'toast.warning': '警告',
        'app.loading': '正在加载...',
        'handle.resize-top': '向上调整大小',
        'handle.resize-bottom': '向下调整大小',
        'handle.resize-left': '向左调整大小',
        'handle.resize-right': '向右调整大小',
        'handle.resize-top-left': '向左上调整大小',
        'handle.resize-top-right': '向右上调整大小',
        'handle.resize-bottom-left': '向左下调整大小',
        'handle.resize-bottom-right': '向右下调整大小',
        'handle.rotate.top_left_rotate': '左上旋转',
        'handle.rotate.top_right_rotate': '右上旋转',
        'handle.rotate.bottom_left_rotate': '左下旋转',
        'handle.rotate.bottom_right_rotate': '右下旋转',
        'handle.crop.top': '向上裁剪',
        'handle.crop.bottom': '向下裁剪',
        'handle.crop.left': '向左裁剪',
        'handle.crop.right': '向右裁剪',
        'handle.crop.top-left': '向左上裁剪',
        'handle.crop.top-right': '向右上裁剪',
        'handle.crop.bottom-left': '向左下裁剪',
        'handle.crop.bottom-right': '向右下裁剪',
        'ui.checked': '已选中',
        'ui.unchecked': '未选中',
      }
    },
    contextMenu(editor, schema) {
      const selectedShapes = editor.getSelectedShapes();
      const hasImage = selectedShapes.some(s => s.type === 'image');
      
      if (hasImage) {
        schema.push({
          id: 'yolo-actions-group',
          type: 'group',
          checkbox: false,
          disabled: false,
          readonlyOk: true,
          children: [
            {
              id: 'generate-from-selection',
              type: 'item',
              actionItem: {
                label: '以此为参考生成',
                onSelect: () => {
                   const ids = new Set(selectedShapes.map(s => s.id));
                   generateFromCanvas(ids);
                }
              }
            },
            {
              id: 'send-to-generator',
              type: 'item',
              actionItem: {
                label: '发送到工作台',
                onSelect: () => {
                   const ids = new Set(selectedShapes.map(s => s.id));
                   sendToGenerator(ids);
                }
              }
            }
          ]
        });
      }
      return schema;
    }
  }), [generateFromCanvas, sendToGenerator]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Auto resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await axios.post('/api/chat', {
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        model: 'gemini-3-flash'
      });

      const assistantContent = response.data.choices[0].message.content;
      const assistantMessage: Message = { role: 'assistant', content: assistantContent };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto project assistant message to canvas
      projectToCanvas(assistantContent, 'assistant');
      
    } catch (error) {
      toast.error('发送失败，请检查后端服务及 API 配置');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空对话记录吗？')) {
      setMessages([
        { role: 'system', content: 'You are Gemini YOLO, a powerful AI assistant in YOLO Mode. You help users with creative tasks, brainstorming, and daring marketing ideas.' }
      ]);
      if (editor) {
          editor.selectAll().deleteShapes(editor.getSelectedShapeIds());
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 h-full bg-[#f5f5f7] dark:bg-black">
      <PanelGroup direction="horizontal">
        {/* Left Panel: Chat */}
        <Panel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col relative border-r border-gray-200 dark:border-white/5">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="space-y-6 pb-24">
                <AnimatePresence initial={false}>
                  {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white dark:bg-[#1d1d1f] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5'
                        }`}>
                          {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                          <div 
                            draggable="true"
                            onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', msg.content);
                                e.dataTransfer.setData('application/yolo-role', msg.role);
                            }}
                            className={`p-3 rounded-[1.2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border relative group/msg-content cursor-grab active:cursor-grabbing ${
                          msg.role === 'user'
                            ? 'bg-white dark:bg-[#1d1d1f] border-blue-500/10 text-gray-800 dark:text-gray-100'
                            : 'bg-white dark:bg-[#1d1d1f] border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-100'
                        }`}>
                          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-[13px]">
                            {msg.content}
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover/msg-content:opacity-100 transition-opacity flex gap-1">
                            <button
                                onClick={() => projectToCanvas(msg.content, msg.role)}
                                className="p-1 bg-gray-100 dark:bg-white/10 rounded-md hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                                title="投影到画布"
                            >
                                <Layout className="w-3 h-3" />
                            </button>
                            {msg.role === 'assistant' && (
                              <button
                                onClick={() => {
                                  localStorage.setItem('pending_prompt', msg.content);
                                  navigate('/');
                                  toast.success('已发送到工作台');
                                }}
                                className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all"
                                title="发送到工作台"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1d1d1f] flex items-center justify-center border border-gray-100 dark:border-white/5">
                        <Bot className="w-4 h-4 text-blue-500 animate-pulse" />
                      </div>
                      <div className="bg-white dark:bg-[#1d1d1f] p-3 rounded-[1.2rem] border border-gray-100 dark:border-white/5 flex items-center gap-2">
                        <div className="flex gap-1">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-[#1d1d1f] border-t border-gray-200 dark:border-white/5">
              <div className="relative group">
                <div className="bg-[#f5f5f7] dark:bg-black rounded-2xl border border-transparent p-2 flex flex-col gap-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="询问 YOLO..."
                    className="w-full bg-transparent border-none focus:ring-0 text-[#1d1d1f] dark:text-[#f5f5f7] py-2 px-3 text-sm font-medium outline-none placeholder:text-gray-400 resize-none max-h-[150px]"
                    rows={1}
                  />
                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex gap-2">
                      <button onClick={clearHistory} title="清空记录" className="p-1.5 text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="bg-black dark:bg-white text-white dark:text-black p-2 rounded-xl shadow-lg disabled:opacity-20 transition-all flex items-center justify-center"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-white/5 hover:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Right Panel: Canvas */}
        <Panel defaultSize={60} minSize={40}>
          <div 
            className="h-full relative overflow-hidden bg-white dark:bg-[#1d1d1f]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();

                // 处理拖入的文件（图片）
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  const imageFiles = files.filter(f => f.type.startsWith('image/'));
                  if (imageFiles.length > 0) {
                    imageFiles.forEach(file => importImage(file));
                    e.stopPropagation(); // 阻止冒泡到 App.tsx，避免重复添加
                    return;
                  }
                }

                // 处理拖入的文本（灵感）
                const text = e.dataTransfer.getData('text/plain');
                const role = e.dataTransfer.getData('application/yolo-role') || 'assistant';
                if (text && editor) {
                    const point = editor.screenToPage({ x: e.clientX, y: e.clientY });
                    editor.createShapes([
                        {
                            id: createShapeId(),
                            type: 'note',
                            x: point.x,
                            y: point.y,
                            props: {
                                richText: toRichText(text),
                                color: role === 'user' ? 'blue' : 'grey',
                            }
                        }
                    ]);
                    toast.success('灵感已投射到画布');
                }
            }}
          >
            <div className="absolute inset-0 z-0">
                <Tldraw 
                    onMount={(editor) => setEditor(editor)}
                    overrides={uiOverrides}
                    inferDarkMode={true}
                    hideUi={false}
                    locale="en"
                />
            </div>
            
            <div className="absolute bottom-4 right-4 z-10">
                <button
                    onClick={() => {
                        if (editor) {
                            const shapes = editor.getShapePageBounds(editor.getCurrentPageId());
                            if (shapes) editor.zoomToSelection();
                        }
                    }}
                    className="p-3 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/10 shadow-xl hover:scale-110 transition-all text-gray-500"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
                                