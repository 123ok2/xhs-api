import React, { useState, useRef, useEffect } from 'react';
import { VoiceName, VoiceStyle } from '../types';
import { generateSpeech, checkSpelling } from '../services/geminiService';
import { decodeAudio, decodeAudioData, bufferToWav } from '../services/audioUtils';

// Mapping technical voice names to user-friendly Vietnamese personas
const VOICE_PERSONAS = [
  {
    id: VoiceName.Kore,
    name: 'Thanh Trúc',
    gender: 'Nữ',
    desc: 'Giọng trầm ấm, điềm đạm',
    tags: ['Tin tức', 'Tài liệu']
  },
  {
    id: VoiceName.Zephyr,
    name: 'Mai Phương',
    gender: 'Nữ',
    desc: 'Giọng cao, nhẹ nhàng',
    tags: ['Đời sống', 'Vlog', 'Kể chuyện']
  },
  {
    id: VoiceName.Puck,
    name: 'Minh Quang',
    gender: 'Nam',
    desc: 'Giọng trung, tự nhiên',
    tags: ['Hội thoại', 'Podcast']
  },
  {
    id: VoiceName.Charon,
    name: 'Quốc Khánh',
    gender: 'Nam',
    desc: 'Giọng trầm, sâu sắc',
    tags: ['Chính luận', 'Đọc sách']
  },
  {
    id: VoiceName.Fenrir,
    name: 'Hải Đăng',
    gender: 'Nam',
    desc: 'Giọng mạnh mẽ, dứt khoát',
    tags: ['Quảng cáo', 'Thông báo']
  }
];

const STYLES = [
  { id: VoiceStyle.Normal, label: 'Mặc định', icon: 'M' },
  { id: VoiceStyle.News, label: 'Tin tức / Thời sự', icon: '📰' },
  { id: VoiceStyle.Story, label: 'Kể chuyện / Cảm xúc', icon: '📖' },
  { id: VoiceStyle.Professional, label: 'Thuyết trình / Công việc', icon: '💼' },
  { id: VoiceStyle.Happy, label: 'Quảng cáo / Vui tươi', icon: '🎉' },
];

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [selectedStyle, setSelectedStyle] = useState<VoiceStyle>(VoiceStyle.Normal);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBufferState, setAudioBufferState] = useState<AudioBuffer | null>(null);
  
  // Spell check state
  const [spellingResult, setSpellingResult] = useState<{correctedText: string, explanation: string} | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000 
    });
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const handleProcessStart = async () => {
    if (!text.trim()) return;
    
    setIsCheckingSpelling(true);
    setError(null);
    setAudioBufferState(null);
    stopAudio();

    try {
      // 1. Check Spelling first
      const check = await checkSpelling(text);
      
      if (check.hasErrors) {
        setSpellingResult({
          correctedText: check.correctedText,
          explanation: check.explanation
        });
        setIsCheckingSpelling(false);
        // Stop here to let user decide via Modal
        return;
      }

      // If no errors, proceed directly
      await generateAudio(text);

    } catch (err) {
      console.error(err);
      setError("Có lỗi khi kiểm tra văn bản.");
      setIsCheckingSpelling(false);
    }
  };

  const generateAudio = async (textToSpeak: string) => {
    setIsLoading(true);
    setSpellingResult(null); // Clear modal if open

    try {
      const base64Audio = await generateSpeech(textToSpeak, selectedVoice, selectedStyle);
      
      if (!base64Audio) {
        throw new Error("No audio data received");
      }

      if (audioContextRef.current) {
        const audioData = decodeAudio(base64Audio);
        const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        
        setAudioBufferState(audioBuffer); // Store for download
        playBuffer(audioBuffer);
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra khi tạo giọng nói. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsCheckingSpelling(false);
    }
  };

  const handleUseCorrected = () => {
    if (spellingResult) {
      setText(spellingResult.correctedText);
      generateAudio(spellingResult.correctedText);
    }
  };

  const handleIgnoreAndProceed = () => {
    generateAudio(text);
  };

  const playBuffer = (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      setIsPlaying(false);
    };

    sourceRef.current = source;
    source.start();
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleDownload = () => {
    if (!audioBufferState) return;

    try {
      const wavBlob = bufferToWav(audioBufferState);
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      // Generate a filename based on the voice and timestamp
      const voiceName = VOICE_PERSONAS.find(v => v.id === selectedVoice)?.name.replace(/\s+/g, '_') || 'voice';
      link.download = `vocalize_${voiceName}_${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Không thể tải xuống file âm thanh.");
    }
  };

  return (
    <div className="flex flex-col space-y-8 animate-fade-in relative">
      
      {/* Spelling Correction Modal */}
      {spellingResult && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm rounded-3xl" onClick={() => setSpellingResult(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-scale-in border border-slate-200">
            <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 className="font-bold text-amber-800 text-lg">Phát hiện lỗi chính tả</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase">Lỗi được tìm thấy:</p>
                <p className="text-slate-700 italic bg-slate-50 p-3 rounded-lg border border-slate-100">"{spellingResult.explanation}"</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase">Văn bản đề xuất:</p>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-900 font-medium">
                  {spellingResult.correctedText}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={handleIgnoreAndProceed}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Giữ nguyên & Tiếp tục
              </button>
              <button 
                onClick={handleUseCorrected}
                className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Sửa & Chuyển đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Voice Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Chọn Giọng Đọc</label>
            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {VOICE_PERSONAS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 group ${
                    selectedVoice === voice.id 
                      ? 'bg-indigo-50 border-primary/50 ring-1 ring-primary/20 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold ${selectedVoice === voice.id ? 'text-primary' : 'text-slate-800'}`}>
                      {voice.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                      selectedVoice === voice.id 
                        ? 'bg-white text-indigo-600 border-indigo-100' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {voice.gender}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2.5">{voice.desc}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {voice.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Mục Đích / Cảm Xúc</label>
            <div className="grid grid-cols-1 gap-2">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 border ${
                    selectedStyle === style.id
                      ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{style.icon}</span>
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Input & Actions */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">3. Nội dung văn bản</label>
          <div className="flex-grow flex flex-col relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập nội dung bạn muốn chuyển thành giọng nói tại đây..."
              className="w-full h-full min-h-[300px] p-6 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all text-slate-800 placeholder-slate-400 text-lg leading-relaxed shadow-sm hover:border-slate-300"
            />
            <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
              {text.length} ký tự
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-sm text-slate-500">
              <span className="block text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wide">Đang chọn:</span>
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {VOICE_PERSONAS.find(v => v.id === selectedVoice)?.name}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-secondary font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {STYLES.find(s => s.id === selectedStyle)?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {audioBufferState && (
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-sm hover:shadow border border-slate-200"
                  title="Tải xuống âm thanh (WAV)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
              )}

              {isPlaying ? (
                <button
                  onClick={stopAudio}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 px-8 rounded-xl transition-all shadow-sm hover:shadow transform active:scale-95 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  Dừng Đọc
                </button>
              ) : (
                <button
                  onClick={handleProcessStart}
                  disabled={isLoading || isCheckingSpelling || !text}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/20 transform active:scale-95 whitespace-nowrap ${
                    isLoading || isCheckingSpelling || !text
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-primary hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isLoading || isCheckingSpelling ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isCheckingSpelling ? "Đang kiểm tra..." : "Đang xử lý..."}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      Chuyển đổi
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;