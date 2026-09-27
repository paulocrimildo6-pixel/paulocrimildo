import React, { useState } from "react";
import { VocabularyItem } from "../types";
import { 
  CheckCircle2, 
  BookMarked, 
  Trash2, 
  Calendar, 
  Check, 
  Clock, 
  HelpCircle,
  FolderOpen
} from "lucide-react";

interface VocabularyBankProps {
  vocabulary: VocabularyItem[];
  onToggleMastered: (id: string) => void;
  onRemoveItem: (id: string) => void;
}

export default function VocabularyBank({
  vocabulary,
  onToggleMastered,
  onRemoveItem,
}: VocabularyBankProps) {
  const [activeTab, setActiveTab] = useState<"active" | "mastered">("active");

  // Group vocabulary by timeframes
  const getGroupedVocabulary = (items: VocabularyItem[]) => {
    const today: VocabularyItem[] = [];
    const yesterday: VocabularyItem[] = [];
    const lastWeek: VocabularyItem[] = [];
    const older: VocabularyItem[] = [];

    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(todayDate.getDate() - 1);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(todayDate.getDate() - 7);

    items.forEach((item) => {
      try {
        const itemDate = new Date(item.dateAdded);
        
        // Simple comparison by locale string or date differences
        const isToday = itemDate.toLocaleDateString() === todayDate.toLocaleDateString() || item.dateAdded === "Hoje" || item.dateAdded === todayDate.toLocaleDateString();
        const isYesterday = itemDate.toLocaleDateString() === yesterdayDate.toLocaleDateString() || item.dateAdded === "Ontem" || item.dateAdded === yesterdayDate.toLocaleDateString();
        
        if (isToday) {
          today.push(item);
        } else if (isYesterday) {
          yesterday.push(item);
        } else if (itemDate > oneWeekAgo) {
          lastWeek.push(item);
        } else {
          older.push(item);
        }
      } catch {
        // Fallback for custom or unparseable string formats
        if (item.dateAdded.includes("Hoje") || item.dateAdded === todayDate.toLocaleDateString()) {
          today.push(item);
        } else if (item.dateAdded.includes("Ontem") || item.dateAdded === yesterdayDate.toLocaleDateString()) {
          yesterday.push(item);
        } else if (item.dateAdded.includes("dia") || item.dateAdded.includes("Semana")) {
          lastWeek.push(item);
        } else {
          older.push(item);
        }
      }
    });

    return { today, yesterday, lastWeek, older };
  };

  // Filter items by active vs archived (mastered)
  const filteredItems = vocabulary.filter((item) => 
    activeTab === "active" ? !item.isMastered : item.isMastered
  );

  const { today, yesterday, lastWeek, older } = getGroupedVocabulary(filteredItems);

  // Helper to check if a group has items
  const hasItems = filteredItems.length > 0;

  const renderGroup = (title: string, items: VocabularyItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-4" key={title}>
        <h4 className="text-xs font-bold font-mono tracking-wider text-gray-400 uppercase flex items-center gap-1.5 pt-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {title}
        </h4>
        
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => (
            <div 
              key={item.id}
              className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group relative overflow-hidden"
            >
              {/* Gold/green corner tag depending on correct status */}
              {item.correctedText && item.correctedText !== item.originalText && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
              )}
              {(!item.correctedText || item.correctedText === item.originalText) && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
              )}

              <div className="space-y-2 flex-1">
                {/* Scenario of Origin & Date Added */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-gray-100/80 text-gray-600 text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-lg border border-gray-200/20 uppercase tracking-wide shrink-0">
                    {item.scenarioSource || "Conversa Livre"}
                  </span>
                  
                  {item.correctedText && item.correctedText !== item.originalText && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg border border-amber-100/50">
                      Expressão Corrigida
                    </span>
                  )}
                </div>

                {/* Phrase Details */}
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-gray-900 leading-snug">
                    {item.originalText}
                  </div>
                  
                  {/* Correction Display */}
                  {item.correctedText && item.correctedText !== item.originalText && (
                    <div className="text-xs text-[#094cb2] bg-blue-50/50 border border-blue-100/30 p-2.5 rounded-xl leading-relaxed">
                      <strong className="text-[10px] font-mono text-blue-800 uppercase block mb-0.5">Frase Recomendada pelo Tutor:</strong>
                      {item.correctedText}
                    </div>
                  )}

                  {/* Translation Cue */}
                  {item.translation && (
                    <p className="text-xs text-gray-500 font-sans leading-relaxed">
                      <span className="font-semibold text-gray-400">Tradução:</span> {item.translation}
                    </p>
                  )}

                  {/* Explanation if any */}
                  {item.explanation && (
                    <p className="text-[11px] text-amber-800 bg-amber-50/50 border border-amber-100/30 p-3 rounded-xl mt-1 leading-relaxed">
                      <span className="font-bold">Dica:</span> {item.explanation}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: "Mastered" and Delete */}
              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                {/* Toggle Mastering Checkmark Button */}
                <button
                  onClick={() => onToggleMastered(item.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border ${
                    item.isMastered 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" 
                      : "bg-[#6d5e00]/10 text-[#6d5e00] border-transparent hover:bg-[#6d5e00]/15"
                  }`}
                  title={item.isMastered ? "Mover de volta para Ativas" : "Marcar como Dominada"}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                    item.isMastered ? "bg-emerald-600 border-transparent text-white" : "border-[#6d5e00] text-[#6d5e00]"
                  }`}>
                    {item.isMastered && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{item.isMastered ? "Dominado" : "Já Domino"}</span>
                </button>

                {/* Remove button */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="Apagar do Vocabulário"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-0.5">
          <h2 className="font-serif text-2xl text-gray-900 tracking-tight flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-[#094cb2]" />
            O Meu Vocabulário
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Guarda automaticamente novos vocabulários e correções recomendadas pela IA durante as simulações.
          </p>
        </div>

        {/* Dynamic active/mastered tabs toggle */}
        <div className="bg-gray-100/80 border border-gray-200/50 p-1 rounded-2xl flex items-center gap-1 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-white text-[#094cb2] shadow-sm font-extrabold"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Ativo ({vocabulary.filter(item => !item.isMastered).length})
          </button>
          <button
            onClick={() => setActiveTab("mastered")}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "mastered"
                ? "bg-[#6d5e00]/10 text-[#6d5e00] shadow-sm font-extrabold"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Dominado ({vocabulary.filter(item => item.isMastered).length})
          </button>
        </div>
      </div>

      {/* Group List rendering */}
      {hasItems ? (
        <div className="space-y-8">
          {renderGroup("Hoje", today)}
          {renderGroup("Ontem", yesterday)}
          {renderGroup("Semana Passada", lastWeek)}
          {renderGroup("Anterior", older)}
        </div>
      ) : (
        <div className="bg-[#f5f3f0] p-12 text-center rounded-3xl border border-gray-200/10 space-y-4 max-w-xl mx-auto mt-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-gray-400 shadow-sm border border-gray-100">
            <FolderOpen className="w-6 h-6 text-gray-300" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-gray-800">
              {activeTab === "active" ? "Lista de vocabulário ativa vazia" : "Ainda não dominou nenhuma palavra"}
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed font-sans px-4">
              {activeTab === "active" 
                ? "Converse de forma livre ou conclua cenários para adicionar vocabulários importantes à sua pasta de aprendizado."
                : "Marque as palavras da lista ativa como 'Já Domino' para guardá-las na sua gaveta de expressões dominadas!"}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
