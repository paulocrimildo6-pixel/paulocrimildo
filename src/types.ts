export type TargetLanguage = "en" | "es" | "fr" | "it" | "de";

export interface LanguageOption {
  code: TargetLanguage;
  name: string;
  flag: string;
  nativeName: string;
  speechLocale: string; // Used for Web Speech API TTS
  welcomeMessage: string;
}

export type LevelType = "Iniciante" | "Intermediário" | "Avançado";

export type ObjectiveType = "Viagem" | "Trabalho" | "Estudos" | "Crescimento Pessoal";

export interface OnboardingState {
  language: TargetLanguage;
  level: LevelType;
  objective: ObjectiveType;
  completed: boolean;
}

export interface Correction {
  hasError: boolean;
  originalText: string;
  correctedText: string;
  explanation: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  translation?: string;
  correction?: Correction | null;
  audioUrl?: string; // Optional recorded audio
  hint?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  initialPrompt: string;
  targetLanguagePrompts: Record<TargetLanguage, string>;
  recommendedLevel: LevelType;
  objective: string;
  objectivePt: string;
  isFree?: boolean;
}

export interface SessionSummary {
  generalFeedback: string;
  strengthPoints: string[];
  commonMistakes: Array<{
    errorPattern: string;
    correction: string;
    explanation: string;
  }>;
  vocabularyLearned: string[];
  suggestedNextSteps: string;
  objectiveCompleted?: boolean;
}

export interface PronunciationResult {
  score: number;
  transcribedText: string;
  accuracy: "Excelente" | "Bom" | "Precisa Praticar";
  feedback: string;
  tips: string[];
}

export interface UserStats {
  streak: number;
  lastPracticeDate: string | null;
  totalMinutes: number;
  totalMessages: number;
  xp: number;
  level: number;
  wordsCount: number;
  isPremium: boolean;
  dailyMinutesRemaining: number;
  maxStreak?: number;
  scenariosCompletedCount?: number;
  activityHistory?: Record<string, number>; // Maps 'YYYY-MM-DD' to number of messages sent
  dailyPronunciationUsed?: number;
}

export interface VocabularyItem {
  id: string;
  originalText: string;
  correctedText?: string;
  translation?: string;
  explanation?: string;
  scenarioSource?: string;
  dateAdded: string; // ISO date string or localized string
  isMastered: boolean;
}

export interface ExtendedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speechLocale: string;
}

export interface TranslationExample {
  original: string;
  translation: string;
}

export interface DifficultWord {
  word: string;
  meaning: string;
  phonetic: string;
  example: string;
}

export interface TranslationResult {
  id: string;
  originalText: string;
  detectedLanguage: string;
  detectedLanguageCode?: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  translation: string;
  phonetic: string;
  explanation: string;
  grammarCorrections?: {
    hasError: boolean;
    correctedOriginal?: string;
    explanation?: string;
  };
  examples: TranslationExample[];
  difficultWords: DifficultWord[];
  timestamp: string;
}

export interface AIExplainResult {
  id: string;
  query: string;
  targetLanguageName: string;
  targetLanguageCode: string;
  meaning: string;
  grammaticalCategory: string;
  simpleExplanation: string;
  usageContext: string;
  culturalNote?: string;
  examples: Array<{ sentence: string; translation: string }>;
  mnemonicTip?: string;
  timestamp: string;
}

