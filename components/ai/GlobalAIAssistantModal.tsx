'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, ShieldCheck, ArrowRight, Zap, RefreshCw, Key, Check } from 'lucide-react';

interface GlobalAIAssistantModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function GlobalAIAssistantModal({ isOpen: externalIsOpen, onClose }: GlobalAIAssistantModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; governance?: any; source?: string }>>([
    {
      role: 'assistant',
      text: 'สวัสดีครับ! ผมคือ S&B ERP AI Assistant ภายใต้การควบคุมของ FIRE KEEPER สามารถสอบถามสต๊อกสินค้า ข้อมูลเอกสารซื้อ-ขาย หรือสถานะการเงินได้เลยครับ',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load API Key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('sb_deepseek_api_key') || '';
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setInternalIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const saveApiKey = (keyToSave: string) => {
    const clean = keyToSave.trim();
    localStorage.setItem('sb_deepseek_api_key', clean);
    setApiKey(clean);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    setInputQuery('');
    setChatHistory((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          apiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'AI query failed');
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          governance: data.governance,
          source: data.source,
        },
      ]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `เกิดข้อผิดพลาดในการสอบถาม: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  const suggestedPrompts = [
    '🛒 สินค้าตัวไหนสต๊อกเหลือน้อยที่สุด',
    '📦 มีกล่องคลังสินค้าอะไรบ้าง',
    '📄 บิลใบสั่งขาย (SO) มีสถานะอย่างไร',
    '💰 สรุปภาพรวมลูกหนี้การค้า',
  ];

  return (
    <>
      {/* Floating Action Button (Always Visible at Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setInternalIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-slate-900 hover:bg-slate-800 text-emerald-400 p-3 rounded-2xl shadow-2xl border border-emerald-500/30 inline-flex items-center gap-2.5 transition-all transform hover:scale-105 group cursor-pointer whitespace-nowrap"
          title="กด Ctrl + K เพื่อเปิด AI Assistant"
        >
          <div className="w-8 h-8 bg-emerald-500/20 rounded-xl inline-flex items-center justify-center text-emerald-400 group-hover:rotate-12 transition-transform shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white pr-1">ERP AI Assistant</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono border border-slate-700 shrink-0">Ctrl + K</span>
        </button>
      )}

      {/* Floating AI Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[85vh] sm:h-[650px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>S&B ERP Governed AI</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> FIRE KEEPER
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">ผู้ช่วยวิเคราะห์ข้อมูลคลังสินค้า เอกสาร และการเงินด้วย AI ควบคุมความถูกต้อง 100%</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                    showSettings || apiKey ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="ตั้งค่า DeepSeek Cloud AI Key"
                >
                  <Key className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px] font-mono">{apiKey ? 'DeepSeek Key: On' : 'ตั้งค่า Key'}</span>
                </button>

                <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DeepSeek API Key Settings Drawer */}
            {showSettings && (
              <div className="bg-slate-900 border-b border-slate-800 p-4 text-white text-xs space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <Key className="w-4 h-4" />
                    <span>ตั้งค่า DeepSeek Cloud AI API Key (สำหรับใช้งานบนเว็บไซต์)</span>
                  </div>
                  {savedSuccess && (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                      <Check className="w-3.5 h-3.5" /> บันทึกเรียบร้อย
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="วาง DeepSeek API Key (sk-................................)"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => saveApiKey(apiKey)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1"
                  >
                    <span>บันทึก Key</span>
                  </button>
                  {apiKey && (
                    <button
                      onClick={() => saveApiKey('')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-xs font-semibold shrink-0"
                      title="ลบ Key"
                    >
                      ลบ
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  💡 API Key จะถูกบันทึกไว้ใน Browser เพื่อเรียกใช้งาน DeepSeek Cloud AI บนเว็บไซต์ได้โดยตรง (ไม่ต้องติดตั้ง Ollama บนเครื่อง)
                </p>
              </div>
            )}

            {/* Chat Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[82%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}>
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Governance Badge for Assistant Response */}
                    {msg.governance && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Validation: {msg.governance.validation?.status || 'PASS'}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                          Confidence: {msg.governance.decision?.confidence?.label || 'HIGH'} ({(msg.governance.decision?.confidence?.score || 0.9).toFixed(2)})
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          Source: {msg.source || 'Firekeeper'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center border border-slate-700 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>กำลังรวบรวมหลักฐานและประมวลผลด้วย FIRE KEEPER...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="px-6 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> คำถามแนะนำ:
              </span>
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.replace(/^[^\s]+\s*/, ''))}
                  className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-full text-xs shrink-0 transition-colors border border-slate-200"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Footer Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="พิมพ์คำถามวิเคราะห์ข้อมูล ERP (เช่น ในคลังมีสินค้าอะไรบ้าง)..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                >
                  <span>ส่งคำถาม</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
