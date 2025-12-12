import React, { useState, useRef, useEffect } from 'react';
import { blobToBase64 } from '../services/audioUtils';
import { transcribeAudio, refineText } from '../services/geminiService';

const SpeechToText: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefining, setIsRefining] = useState(false); // New state for AI refinement
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    setTranscribedText('');
    setIsCopied(false);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt của bạn không hỗ trợ ghi âm.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME type
      const mimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg', 
        'audio/wav',
        'audio/aac'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      if (!selectedMimeType) {
        console.warn("No standard MIME type supported, defaulting to browser default.");
        selectedMimeType = '';
      }

      mimeTypeRef.current = selectedMimeType || 'audio/webm';

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setErrorMessage(err.message || "Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleRecordingStop = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    
    setTimeout(async () => {
        try {
            const type = mimeTypeRef.current || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type });
            
            if (audioBlob.size === 0) {
                setErrorMessage("Lỗi: Không thu được dữ liệu âm thanh (File rỗng).");
                setIsProcessing(false);
                return;
            }

            const base64Audio = await blobToBase64(audioBlob);
            const cleanMimeType = type.split(';')[0];
            const text = await transcribeAudio(base64Audio, cleanMimeType);
            setTranscribedText(text);
        } catch (error: any) {
            console.error("Transcription error:", error);
            setErrorMessage(error.message || "Lỗi không xác định khi chuyển đổi.");
        } finally {
            setIsProcessing(false);
        }
    }, 100);
  };

  // AI Refinement Handler
  const handleRefineText = async (type: 'fix_spelling' | 'optimize') => {
    if (!transcribedText) return;
    
    setIsRefining(true);
    try {
      const refined = await refineText(transcribedText, type);
      setTranscribedText(refined);
    } catch (error) {
      console.error("Refinement error:", error);
      // Optional: show a toast or message
    } finally {
      setIsRefining(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    if (!transcribedText) return;
    try {
      await navigator.clipboard.writeText(transcribedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadText = () => {
    if (!transcribedText) return;
    
    // Create HTML content with Word-compatible structure
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Vocalize Transcription</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; }
          p { margin-bottom: 1em; }
        </style>
      </head>
      <body>
        ${transcribedText.split('\n').map(line => `<p>${line}</p>`).join('')}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `transcription_${timestamp}.doc`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors">
        
        {isRecording ? (
          <div className="text-center space-y-4">
             <div className="relative flex items-center justify-center w-24 h-24">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20"></span>
                <button 
                  onClick={stopRecording}
                  className="relative flex items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full hover:scale-105 transition-transform shadow-lg shadow-red-500/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
             </div>
             <div className="text-red-500 font-mono text-xl font-bold">{formatTime(recordingDuration)}</div>
             <p className="text-sm text-slate-500">Đang ghi âm... Nhấn để dừng</p>
          </div>
        ) : (
          <div className="text-center space-y-5">
             <button 
                onClick={startRecording}
                disabled={isProcessing || isRefining}
                className={`flex items-center justify-center w-24 h-24 rounded-full transition-all shadow-xl ${
                  isProcessing || isRefining
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-white text-primary hover:text-white hover:bg-primary border border-slate-100 hover:scale-105 shadow-slate-200'
                }`}
              >
                {isProcessing ? (
                  <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 2.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                )}
             </button>
             <p className="text-sm font-medium text-slate-500">
               {isProcessing ? 'Đang xử lý âm thanh...' : (isRefining ? 'Đang tối ưu hóa...' : 'Nhấn vào micro để bắt đầu nói')}
             </p>
          </div>
        )}
        
        {errorMessage && (
           <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 max-w-sm">
             {errorMessage}
           </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-2 px-1 mb-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kết quả văn bản</label>
          
          {transcribedText && (
            <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto">
               {/* AI Tools */}
               <div className="flex items-center gap-2 mr-2 pr-2 border-r border-slate-200">
                 <button 
                   onClick={() => handleRefineText('fix_spelling')}
                   disabled={isRefining}
                   className="text-xs font-medium text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                   title="Sửa lỗi chính tả tự động"
                 >
                   {isRefining ? (
                     <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                   )}
                   Sửa lỗi
                 </button>
                 <button 
                   onClick={() => handleRefineText('optimize')}
                   disabled={isRefining}
                   className="text-xs font-medium text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                   title="Viết lại cho hay hơn, trôi chảy hơn"
                 >
                   {isRefining ? (
                     <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                   )}
                   Viết lại hay hơn
                 </button>
               </div>

               {/* Export Tools */}
               <div className="flex items-center gap-2">
                 <button 
                   onClick={handleDownloadText}
                   className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                   title="Tải về máy (.doc)"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                   .doc
                 </button>
                 
                 <button 
                   onClick={handleCopy}
                   className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-sm border ${
                      isCopied 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-indigo-50 text-primary hover:text-indigo-700 hover:bg-indigo-100 border-indigo-100'
                   }`}
                 >
                   {isCopied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Đã chép
                      </>
                   ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Sao chép
                      </>
                   )}
                 </button>
               </div>
            </div>
          )}
        </div>
        
        <div className="w-full h-48 p-5 bg-white border border-slate-200 rounded-xl overflow-y-auto shadow-sm relative group">
          {transcribedText ? (
            <p className="whitespace-pre-wrap leading-relaxed text-slate-800 text-lg">{transcribedText}</p>
          ) : (
            <p className="text-slate-400 italic">Văn bản chuyển đổi sẽ xuất hiện ở đây...</p>
          )}
          
          {isRefining && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
               <div className="flex flex-col items-center gap-2">
                 <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-semibold text-primary">AI đang xử lý...</span>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechToText;