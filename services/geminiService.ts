import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName, VoiceStyle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const stylePrompts: Record<VoiceStyle, string> = {
  [VoiceStyle.Normal]: '',
  [VoiceStyle.News]: 'Hãy đọc văn bản sau với giọng đọc tin tức thời sự: nghiêm túc, rõ ràng, ngắt nghỉ đúng nhịp và chuyên nghiệp.',
  [VoiceStyle.Story]: 'Hãy đọc văn bản sau với giọng kể chuyện: giàu cảm xúc, trầm lắng, cuốn hút và diễn cảm.',
  [VoiceStyle.Happy]: 'Hãy đọc văn bản sau với giọng điệu quảng cáo: vui tươi, hào hứng, tràn đầy năng lượng và mời gọi.',
  [VoiceStyle.Professional]: 'Hãy đọc văn bản sau với giọng điệu thuyết trình: tự tin, đĩnh đạc, thuyết phục và dõng dạc.'
};

export const checkSpelling = async (text: string): Promise<{ hasErrors: boolean; correctedText: string; explanation: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Kiểm tra lỗi chính tả và ngữ pháp cho đoạn văn bản tiếng Việt sau: "${text}". 
      Nếu có lỗi, hãy sửa lại cho đúng. Nếu không có lỗi hoặc chỉ là tên riêng, hãy giữ nguyên.
      Trả về kết quả dưới dạng JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasErrors: { type: Type.BOOLEAN, description: "True nếu tìm thấy lỗi sai chính tả hoặc ngữ pháp nghiêm trọng." },
            correctedText: { type: Type.STRING, description: "Văn bản đã được sửa lỗi." },
            explanation: { type: Type.STRING, description: "Giải thích ngắn gọn về các lỗi đã sửa (nếu có)." }
          },
          required: ["hasErrors", "correctedText", "explanation"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      hasErrors: result.hasErrors || false,
      correctedText: result.correctedText || text,
      explanation: result.explanation || ''
    };
  } catch (error) {
    console.error("Error checking spelling:", error);
    // Fallback: assume no errors if API fails to avoid blocking user
    return { hasErrors: false, correctedText: text, explanation: '' };
  }
};

export const refineText = async (text: string, type: 'fix_spelling' | 'optimize'): Promise<string> => {
  try {
    const prompt = type === 'fix_spelling' 
      ? `Hãy kiểm tra lỗi chính tả và ngữ pháp cho đoạn văn bản tiếng Việt dưới đây. Chỉ sửa các lỗi sai, giữ nguyên ý nghĩa và văn phong gốc. Trả về văn bản đã sửa. Văn bản: "${text}"`
      : `Hãy viết lại đoạn văn bản tiếng Việt dưới đây sao cho hay hơn, trôi chảy, gãy gọn và chuyên nghiệp hơn. Giữ nguyên ý chính. Trả về văn bản đã viết lại. Văn bản: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return response.text || text;
  } catch (error) {
    console.error("Error refining text:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string, voice: VoiceName, style: VoiceStyle = VoiceStyle.Normal): Promise<string | undefined> => {
  try {
    // Construct the prompt with style instructions
    const promptText = style === VoiceStyle.Normal 
      ? text 
      : `${stylePrompts[style]}\n\nNội dung văn bản: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            },
            {
              text: "Nghe đoạn âm thanh này và chép lại chính xác nội dung bằng tiếng Việt. Bỏ qua các âm thanh nền hoặc tiếng ồn. Chỉ trả về văn bản, không thêm lời dẫn."
            }
          ]
        }
      ]
    });

    return response.text || "Không thể chuyển đổi âm thanh (Kết quả rỗng).";
  } catch (error: any) {
    console.error("Error transcribing audio:", error);
    throw new Error(error.message || "Lỗi kết nối đến dịch vụ AI.");
  }
};