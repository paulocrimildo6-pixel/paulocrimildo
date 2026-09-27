import React, { useState } from "react";
import { LANGUAGES } from "../data";
import { OnboardingState, TargetLanguage, LevelType, ObjectiveType } from "../types";
import { Check, ArrowRight, Sparkles, BookOpen, GraduationCap } from "lucide-react";

interface OnboardingProps {
  initialState?: OnboardingState;
  onComplete: (state: OnboardingState) => void;
}

export default function Onboarding({ initialState, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>(
    initialState?.language || "en"
  );
  const [selectedLevel, setSelectedLevel] = useState<LevelType>(
    initialState?.level || "Iniciante"
  );
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveType>(
    initialState?.objective || "Viagem"
  );

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as any);
    } else {
      onComplete({
        language: selectedLanguage,
        level: selectedLevel,
        objective: selectedObjective,
        completed: true,
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === selectedLanguage);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfbfa] px-4 py-12 font-sans selection:bg-blue-100 selection:text-[#094cb2]">
      <div className="w-full max-w-xl bg-[#f5f3f0] rounded-3xl p-8 md:p-12 shadow-sm transition-all duration-300 relative overflow-hidden">
        {/* Background ambient gradient accent */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#6d5e00]/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Progress header */}
        <div className="flex justify-between items-center mb-10">
          <span className="font-mono text-xs text-[#6d5e00] tracking-wider uppercase">
            Passo {step} de 3
          </span>
          <div className="flex gap-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? "w-8 bg-[#094cb2]" : "w-3 bg-[#e4e1db]"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? "w-8 bg-[#094cb2]" : "w-3 bg-[#e4e1db]"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? "w-8 bg-[#094cb2]" : "w-3 bg-[#e4e1db]"}`} />
          </div>
        </div>

        {/* Step 1: Language */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-3xl md:text-4xl text-[#1a1a1a] tracking-tight leading-tight mb-4">
              Que idioma queres dominar?
            </h1>
            <p className="text-sm text-gray-600 mb-8 font-sans">
              Esquece exercícios robóticos. Vamos conversar desde o primeiro dia. Escolhe a tua língua alvo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 text-left ${
                    selectedLanguage === lang.code
                      ? "bg-white ring-2 ring-[#094cb2]/20 shadow-md transform -translate-y-0.5"
                      : "bg-[#ece9e4] hover:bg-[#e4e1db] text-[#333333]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{lang.flag}</span>
                    <div>
                      <div className="font-medium text-sm text-[#1a1a1a]">{lang.name}</div>
                      <div className="text-xs text-gray-500 italic">{lang.nativeName}</div>
                    </div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <div className="w-5 h-5 bg-[#094cb2] text-white rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Level */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-3xl md:text-4xl text-[#1a1a1a] tracking-tight leading-tight mb-4">
              Qual é o teu nível atual?
            </h1>
            <p className="text-sm text-gray-600 mb-8 font-sans">
              O tutor Gemini adaptará o vocabulário e a complexidade das frases de acordo com as tuas capacidades.
            </p>

            <div className="space-y-3 mb-10">
              {(["Iniciante", "Intermediário", "Avançado"] as LevelType[]).map((lvl) => {
                const getDesc = (l: LevelType) => {
                  if (l === "Iniciante") return "Consigo entender algumas palavras e responder de forma simples.";
                  if (l === "Intermediário") return "Já consigo estruturar diálogos e falar sobre vários temas.";
                  return "Compreendo e expresso-me com fluidez em situações complexas.";
                };

                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`w-full flex items-start gap-4 p-5 rounded-2xl transition-all duration-200 text-left ${
                      selectedLevel === lvl
                        ? "bg-white ring-2 ring-[#094cb2]/20 shadow-md"
                        : "bg-[#ece9e4] hover:bg-[#e4e1db]"
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${selectedLevel === lvl ? "bg-blue-100 text-[#094cb2]" : "bg-[#e4e1db] text-[#555]"}`}>
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-[#1a1a1a]">{lvl}</div>
                      <div className="text-xs text-gray-500 mt-1">{getDesc(lvl)}</div>
                    </div>
                    {selectedLevel === lvl && (
                      <div className="w-5 h-5 bg-[#094cb2] text-white rounded-full flex items-center justify-center self-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Objective */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-3xl md:text-4xl text-[#1a1a1a] tracking-tight leading-tight mb-4">
              Qual é o teu objetivo?
            </h1>
            <p className="text-sm text-gray-600 mb-8 font-sans">
              O Gemini priorizará tópicos e vocabulários baseados no teu foco principal.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {(["Viagem", "Trabalho", "Estudos", "Crescimento Pessoal"] as ObjectiveType[]).map((obj) => {
                const getIcon = (o: ObjectiveType) => {
                  if (o === "Viagem") return "✈️";
                  if (o === "Trabalho") return "💼";
                  if (o === "Estudos") return "🎓";
                  return "🌱";
                };

                return (
                  <button
                    key={obj}
                    onClick={() => setSelectedObjective(obj)}
                    className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-200 text-left ${
                      selectedObjective === obj
                        ? "bg-white ring-2 ring-[#094cb2]/20 shadow-md transform -translate-y-0.5"
                        : "bg-[#ece9e4] hover:bg-[#e4e1db]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{getIcon(obj)}</span>
                      <span className="font-medium text-sm text-[#1a1a1a]">{obj}</span>
                    </div>
                    {selectedObjective === obj && (
                      <div className="w-5 h-5 bg-[#094cb2] text-white rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-4 rounded-2xl bg-transparent hover:bg-[#ece9e4] text-gray-700 font-medium text-sm transition-all"
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#094cb2] to-[#1e5ebf] hover:opacity-95 text-white font-medium text-sm shadow-md transition-all active:scale-[0.98]"
          >
            {step === 3 ? "Começar Conversação" : "Continuar"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="mt-8 flex items-center gap-2 justify-center text-xs text-gray-500">
            <Sparkles className="w-4 h-4 text-[#6d5e00]" />
            <span>Alimentado pela avançada IA do Google Gemini</span>
          </div>
        )}
      </div>
    </div>
  );
}
