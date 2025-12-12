export enum AppMode {
  TTS = 'TEXT_TO_SPEECH',
  STT = 'SPEECH_TO_TEXT'
}

export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export enum VoiceStyle {
  Normal = 'Bình thường',
  News = 'Tin tức',
  Story = 'Kể chuyện',
  Happy = 'Vui tươi',
  Professional = 'Chuyên nghiệp'
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
}