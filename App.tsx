import React, { useState } from 'react';
import TextToSpeech from './components/TextToSpeech';
import SpeechToText from './components/SpeechToText';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TTS);

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white flex flex-col">
      <div className="w-full flex-grow overflow-y-auto">
        
        {/* Header */}
        <header className="fixed top-0 w-full z-50 glass-panel border-b border-slate-200/60 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-slate-800 block leading-none">Vocalize</span>
                <span className="text-[10px] text-slate-500 font-medium">Dev Duy Hạnh</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                Công nghệ xử lý 2.5
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
              Chuyển đổi <span className="gradient-text">Âm thanh</span> thông minh
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Trải nghiệm công nghệ tiên tiến giúp chuyển văn bản thành giọng nói tự nhiên và ghi âm chính xác.
            </p>
          </div>

          {/* Navigation/Tabs */}
          <div className="flex justify-center mb-10">
            <div className="bg-white p-1.5 rounded-2xl inline-flex shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100">
              <button
                onClick={() => setMode(AppMode.TTS)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                  mode === AppMode.TTS
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                Văn bản sang Giọng nói
              </button>
              <button
                onClick={() => setMode(AppMode.STT)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                  mode === AppMode.STT
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Giọng nói sang Văn bản
              </button>
            </div>
          </div>

          {/* Application Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white relative overflow-hidden min-h-[500px]">
            {/* Decorative background blurs - lighter for bright theme */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              {mode === AppMode.TTS ? <TextToSpeech /> : <SpeechToText />}
            </div>
          </div>
        </main>
      </div>
      
      {/* Footer with Author & Contact Info */}
      <footer className="bg-white border-t border-slate-200 py-8 z-10 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <h3 className="font-bold text-lg text-blue-900 mb-2 uppercase tracking-wide">Hỗ trợ kỹ thuật</h3>
          
          <div className="space-y-2 text-slate-600 font-medium">
            <p className="text-base">
              Phát triển bởi: <span className="text-amber-500 font-bold">Developer Duy Hạnh</span>
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-sm md:text-base">
              <a href="mailto:duyconghanh2017@gmail.com" className="hover:text-primary transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                duyconghanh2017@gmail.com
              </a>
              <span className="hidden md:inline text-slate-300">|</span>
              <a href="tel:0868640898" className="hover:text-primary transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                SĐT: 0868.640.898
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-slate-400 text-xs">
            Bản quyền © 2024. All rights reserved.
          </div>

        </div>
      </footer>
    </div>
  );
};

export default App;