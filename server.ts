import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  processCaktoWebhook,
  getSubscriptionByEmail,
  getAllSubscriptions,
  getAllEvents
} from "./server/subscriptions";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON with a large limit for base64 audio
app.use(express.json({ limit: "20mb" }));

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Check server health
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({ status: "ok", geminiKeyConfigured: hasKey });
});

// Endpoint: Cakto Checkout Configuration
app.get("/api/config/checkout", (req, res) => {
  const checkoutUrl = process.env.CAKTO_CHECKOUT_URL || "https://chk.cakto.com.br/lingo-conversa-premium";
  res.json({
    checkoutUrl,
    planName: "Lingo Conversa Premium",
    price: "R$ 20,00",
    interval: "mês",
    currency: "BRL"
  });
});

// Endpoint: Check User Subscription Status (Backend Source of Truth)
app.get("/api/subscription/status", (req, res) => {
  const email = (req.query.email as string || "").toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: "Parâmetro 'email' é obrigatório." });
  }

  const sub = getSubscriptionByEmail(email);
  if (!sub) {
    return res.json({
      email,
      isPremium: false,
      subscription_plan: "free",
      subscription_status: "none",
      subscription_started_at: null,
      subscription_expires_at: null,
      cakto_subscription_id: null
    });
  }

  // Active check
  const isActive = sub.subscription_plan === "premium" && sub.subscription_status === "active";

  res.json({
    email: sub.email,
    full_name: sub.full_name,
    isPremium: isActive,
    subscription_plan: sub.subscription_plan,
    subscription_status: sub.subscription_status,
    cakto_customer_id: sub.cakto_customer_id,
    cakto_product_id: sub.cakto_product_id,
    cakto_subscription_id: sub.cakto_subscription_id,
    subscription_started_at: sub.subscription_started_at,
    subscription_expires_at: sub.subscription_expires_at,
    updated_at: sub.updated_at
  });
});

// Endpoint: Official Cakto Webhook Handler
// Receives: purchase_approved, purchase_refused, subscription_renewed, subscription_canceled, refund, chargeback
app.post("/api/webhooks/cakto", (req, res) => {
  try {
    const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET;
    const providedSecret =
      req.body?.secret ||
      req.headers["x-cakto-secret"] ||
      req.headers["x-webhook-secret"] ||
      req.query.secret;

    // Authenticity check: if secret is configured in env, strictly enforce it
    if (expectedSecret && providedSecret !== expectedSecret) {
      console.warn("[Cakto Webhook] Requisição rejeitada: segredo inválido ou ausente.");
      return res.status(401).json({
        error: "Não autorizado. Assinatura ou segredo do webhook inválido."
      });
    }

    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Payload do webhook inválido ou vazio." });
    }

    const result = processCaktoWebhook(payload);

    if (!result.success && result.status === "error") {
      return res.status(400).json({
        received: false,
        error: result.reason
      });
    }

    // Return 200 OK to Cakto as expected by official webhook specifications
    return res.status(200).json({
      received: true,
      status: result.status,
      event_id: result.event_id,
      reason: result.reason,
      subscription_plan: result.subscription?.subscription_plan,
      subscription_status: result.subscription?.subscription_status
    });
  } catch (error: any) {
    console.error("[Cakto Webhook] Erro inesperado ao processar webhook:", error);
    return res.status(500).json({ error: "Erro interno ao processar webhook da Cakto." });
  }
});

// Endpoint: Admin Subscriptions & Events Audit
app.get("/api/admin/subscriptions", (req, res) => {
  try {
    const subscriptions = getAllSubscriptions();
    const events = getAllEvents();
    res.json({
      total: Object.keys(subscriptions).length,
      active_premium_count: Object.values(subscriptions).filter(s => s.subscription_status === "active" && s.subscription_plan === "premium").length,
      subscriptions,
      recent_events: events.slice(0, 50)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao consultar dados de assinaturas." });
  }
});

// Endpoint: Admin Simulate Webhook (Development & Admin testing)
app.post("/api/admin/simulate-webhook", (req, res) => {
  try {
    const { event, email, name, productId, subscriptionId } = req.body;
    if (!event || !email) {
      return res.status(400).json({ error: "Os campos 'event' e 'email' são obrigatórios." });
    }

    const mockPayload = {
      event,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      data: {
        id: subscriptionId || `sub_${Date.now()}`,
        customer: {
          id: `cust_${Date.now()}`,
          name: name || email.split("@")[0],
          email: email
        },
        product: {
          id: productId || "cakto_lingo_premium_prod",
          name: "Lingo Conversa Premium",
          price: 20.00
        },
        subscription: {
          id: subscriptionId || `sub_${Date.now()}`,
          status: event === "purchase_approved" || event === "subscription_renewed" ? "active" : "canceled"
        }
      }
    };

    const result = processCaktoWebhook(mockPayload);
    res.json({
      simulation: true,
      result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao simular webhook." });
  }
});

// Endpoint: AI Chat Conversation with Gentle Correction (JSON Schema Guided)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, language, level, scenario, objective } = req.body;

    if (!language || !level) {
      return res.status(400).json({ error: "Idioma e nível são obrigatórios." });
    }

    const ai = getGeminiClient();

    // System instruction to guide the Gemini language tutor
    const systemInstruction = `
Você é o tutor particular e coach de idiomas do LingoConversa, um aplicativo de aprendizado focado em conversação real com IA.
Seu objetivo é conversar com o utilizador no idioma alvo de forma natural, realista e adaptada ao seu nível atual.

IDIOMA ALVO: ${language}
NÍVEL DO ALUNO: ${level}
CENÁRIO DA VIDA REAL: ${scenario ? `"${scenario}"` : "Conversa livre, amigável e cotidiana."}
OBJETIVO DO ALUNO: ${objective || "Geral (Viagem/Trabalho/Estudos)"}

Diretrizes de atuação:
1. Responda estritamente NO IDIOMA ALVO: ${language}.
2. Adeque seu vocabulário e a complexidade das frases ao nível selecionado:
   - "Iniciante": Frases curtas, vocabulário essencial, perguntas diretas e simples para facilitar a resposta.
   - "Intermediário": Frases mais elaboradas, expressões comuns, perguntas abertas que estimulem respostas completas.
   - "Avançado": Vocabulário avançado, expressões idiomáticas, ritmo nativo, tópicos profundos ou profissionais.
3. Conduza o diálogo de forma envolvente. Sempre encerre a sua fala com uma pergunta ou gancho para manter a conversa fluindo naturalmente.
4. Mantenha o papel do cenário (${scenario ? "permanecendo rigorosamente no personagem do início ao fim da conversa" : "sendo um tutor de conversa simpático"}).
5. CORREÇÃO DE ERROS (MUITO IMPORTANTE):
   - Analise com cuidado a ÚLTIMA mensagem que o usuário escreveu.
   - Identifique erros gramaticais, de ortografia, de concordância ou de uso não natural das palavras no idioma alvo.
   - Se houver qualquer erro, preencha o objeto "correction" detalhando-o de forma gentil e didática, com a explicação escrita em PORTUGUÊS.
   - Se o usuário não cometeu erros e a frase foi natural, preencha o campo "correction" definindo "hasError" como false e os demais subcampos como strings vazias.
   - NÃO mencione a correção ou o erro na sua resposta direta ("reply") no idioma alvo. Mantenha o fluxo da conversa perfeitamente natural nela. A correção será exibida separadamente no aplicativo de forma discreta para não quebrar a imersão.
7. STATUS DO OBJETIVO (scenarioStatus):
   - Avalie se o aluno cumpriu o objetivo prático do cenário ("${objective}").
   - Quando o aluno falar algo que satisfaça plenamente o objetivo do cenário (ou chegar a uma conclusão satisfatória do objetivo), defina objectiveCompleted como true. Caso contrário, ou se for conversa livre, defina como false.
8. DICA DO TUTOR (hint):
   - Se for um cenário com objetivo prático, forneça uma pequena dica ou frase sugerida no idioma alvo (${language}) para ajudar o aluno a responder neste turno e avançar em direção ao objetivo do cenário. Deixe vazio se for conversa livre.

Responda rigorosamente no formato JSON de acordo com o esquema definido.
`;

    // Map message format from frontend to Gemini contents API
    // Ensure we send historical context if available
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Sua resposta natural mantendo o diálogo fluído, escrita estritamente no idioma alvo."
            },
            translation: {
              type: Type.STRING,
              description: "A tradução amigável da sua resposta ('reply') para o Português."
            },
            correction: {
              type: Type.OBJECT,
              description: "Análise didática da última mensagem enviada pelo usuário.",
              properties: {
                hasError: {
                  type: Type.BOOLEAN,
                  description: "Define se o usuário cometeu algum erro na sua última mensagem."
                },
                originalText: {
                  type: Type.STRING,
                  description: "O trecho exato que continha o erro. Deixe vazio se hasError for false."
                },
                correctedText: {
                  type: Type.STRING,
                  description: "Como ficaria a frase de forma correta e natural. Deixe vazio se hasError for false."
                },
                explanation: {
                  type: Type.STRING,
                  description: "Uma explicação extremamente gentil, didática e de encorajamento em português explicando o erro. Deixe vazio se hasError for false."
                }
              },
              required: ["hasError", "originalText", "correctedText", "explanation"]
            },
            scenarioStatus: {
              type: Type.OBJECT,
              description: "Avaliação do objetivo prático do cenário pelo tutor.",
              properties: {
                objectiveCompleted: {
                  type: Type.BOOLEAN,
                  description: "Define se o usuário cumpriu completamente o objetivo prático do cenário neste ponto da conversa. Se for conversa livre, retorne false."
                },
                explanation: {
                  type: Type.STRING,
                  description: "Uma curta e gentil mensagem em português elogiando a conclusão do objetivo se concluído, caso contrário deixe em branco."
                }
              },
              required: ["objectiveCompleted", "explanation"]
            },
            hint: {
              type: Type.STRING,
              description: "Uma sugestão de frase em formato de dica em idioma alvo para ajudar o aluno a responder neste turno e atingir o objetivo. Deixe em branco se for conversa livre."
            }
          },
          required: ["reply", "translation", "correction", "scenarioStatus", "hint"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini não retornou dados de conversação." });
    }

    const parsedData = JSON.parse(text);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Erro na rota /api/chat:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar a conversa." });
  }
});

// Endpoint: AI End-of-Session Summary of Errors & Progress
app.post("/api/summary", async (req, res) => {
  try {
    const { messages, language, level, scenario, scenarioObjective } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Histórico de mensagens é necessário." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `
Você é o coordenador pedagógico do LingoConversa.
O aluno acabou de encerrar uma sessão de conversação no idioma alvo: ${language} (nível: ${level}).
${scenario ? `O cenário praticado foi: "${scenario}". O objetivo do cenário era: "${scenarioObjective}".` : ""}
Sua tarefa é analisar o histórico da conversa e gerar um relatório didático, encorajador e detalhado que ajude no aprendizado.

Analise as mensagens do usuário (user) e crie um resumo de progresso formatado em JSON.
Identifique padrões de erros frequentes, destaque os acertos e palavras interessantes aprendidas ou utilizadas.
Diga se o objetivo do cenário foi alcançado com base no diálogo de forma clara no campo "objectiveCompleted".
`;

    const chatHistoryText = messages
      .map((m: any) => `${m.role === "user" ? "Aluno" : "Tutor"}: ${m.text}`)
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Aqui está o histórico da conversa para análise:\n\n${chatHistoryText}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalFeedback: {
              type: Type.STRING,
              description: "Um parágrafo de feedback geral super encorajador em português sobre o desempenho geral do aluno nesta sessão."
            },
            strengthPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Pontos fortes demonstrados pelo aluno (ex: vocabulário bom, boa iniciativa, conjugações corretas)."
            },
            commonMistakes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  errorPattern: { type: Type.STRING, description: "O erro ou padrão de erro cometido pelo aluno." },
                  correction: { type: Type.STRING, description: "A forma correta sugerida." },
                  explanation: { type: Type.STRING, description: "Explicação curta e simples em português do porquê está incorreto." }
                },
                required: ["errorPattern", "correction", "explanation"]
              },
              description: "Lista de erros mais comuns ou relevantes identificados na sessão."
            },
            vocabularyLearned: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Vocabulário útil ou novas expressões de destaque que apareceram na conversa com suas traduções simples."
            },
            suggestedNextSteps: {
              type: Type.STRING,
              description: "Próximos passos recomendados para o estudo (ex: praticar mais o passado dos verbos, expandir vocabulário de comidas, etc.)."
            },
            objectiveCompleted: {
              type: Type.BOOLEAN,
              description: "Indica se o aluno conseguiu concluir com êxito o objetivo do cenário com base no diálogo. Se for conversa livre, defina como true."
            }
          },
          required: ["generalFeedback", "strengthPoints", "commonMistakes", "vocabularyLearned", "suggestedNextSteps", "objectiveCompleted"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini não retornou dados de resumo." });
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Erro na rota /api/summary:", error);
    res.status(500).json({ error: error.message || "Erro interno ao gerar o resumo pedagógico." });
  }
});

// Endpoint: AI Audio Pronunciation Evaluation (Multimodal Gemini 3.5 Flash)
app.post("/api/pronunciation", async (req, res) => {
  try {
    const { audioBase64, expectedText, language, mimeType } = req.body;

    if (!audioBase64 || !expectedText || !language) {
      return res.status(400).json({ error: "Áudio base64, frase esperada e idioma são obrigatórios." });
    }

    const ai = getGeminiClient();

    // Prepare prompt and media part
    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioBase64
      }
    };

    const promptText = `
Você é um especialista em fonética e pronúncia do LingoConversa.
O aluno gravou o áudio em anexo tentando pronunciar a seguinte frase em ${language}:
"${expectedText}"

Sua tarefa é ouvir o áudio fornecido, compará-lo à frase esperada e dar uma avaliação didática e amigável da pronúncia.
Preencha o JSON estruturado de retorno avaliando:
1. O texto que você realmente transcreveu do áudio (para ver se ele conseguiu pronunciar de forma compreensível).
2. Uma nota geral de 0 a 100 de acordo com a precisão fônica, entonação e clareza.
3. Um feedback acolhedor em português dando dicas fáceis para melhorar (ex: dicas sobre como pronunciar vogais nasais, consoantes específicas ou junções de sons).
4. Uma classificação geral de precisão ('Excelente', 'Bom' ou 'Precisa Praticar').
5. Identifique de 1 a 3 palavras específicas da frase que soaram menos naturais ou que o aluno teve mais dificuldade para pronunciar, e adicione dicas de pronúncia fáceis e fonéticas para cada uma delas no campo "mispronouncedWords" (ex: palavra "thought", dica "Coloque a língua entre os dentes para fazer o som 'th'"). Se a pronúncia foi perfeita, retorne uma lista com palavras sugeridas de treino da frase com suas dicas fáceis correspondentes.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          parts: [
            audioPart,
            { text: promptText }
          ]
        }
      ],
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "Nota geral de 0 a 100 baseada na qualidade de pronúncia."
            },
            transcribedText: {
              type: Type.STRING,
              description: "O texto exatamente transcrito do que foi ouvido no áudio."
            },
            accuracy: {
              type: Type.STRING,
              description: "Classificação da pronúncia: 'Excelente', 'Bom', ou 'Precisa Praticar'."
            },
            feedback: {
              type: Type.STRING,
              description: "Feedback fonético gentil, específico e didático em português."
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Dicas práticas de pronúncia em português (tópicos curtos) para os sons específicos dessa frase."
            },
            mispronouncedWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "A palavra específica analisada." },
                  tip: { type: Type.STRING, description: "Sugestão ou instrução fonética simples em português." }
                },
                required: ["word", "tip"]
              },
              description: "Lista de palavras que precisam de prática fônica ou atenção especial nesta frase."
            }
          },
          required: ["score", "transcribedText", "accuracy", "feedback", "tips", "mispronouncedWords"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini não retornou dados de pronúncia." });
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Erro na rota /api/pronunciation:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar pronúncia de áudio." });
  }
});

// Endpoint: AI Translation & Language Identification (100+ Languages)
app.post("/api/translate", async (req, res) => {
  try {
    const { text: inputText, targetLanguageName, targetLanguageCode } = req.body;

    if (!inputText || !targetLanguageName) {
      return res.status(400).json({ error: "Texto de entrada e idioma de destino são obrigatórios." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `
Você é o tradutor e linguista inteligente do LingoConversa.
Sua missão é processar a frase, palavra ou texto enviado pelo utilizador, realizando as seguintes tarefas:

1. DETECTAR AUTOMATICAMENTE o idioma original de entrada (ex: "Português", "Inglês", "Espanhol", "Francês", etc.) e o seu código ISO (ex: "pt", "en", "es").
2. TRADUZIR com extrema precisão, fluência e naturalidade para o idioma de destino selecionado pelo usuário: "${targetLanguageName}".
3. FORNECER PRONÚNCIA ESCRITA (fonética simplificada/intuitiva de leitura) para a frase traduzida em "${targetLanguageName}".
4. EXPLICAR O SIGNIFICADO de forma didática, simples e rápida em Português.
5. CORRIGIR ERROS GRAMATICIAIS OU ORTOGRÁFICOS no texto original de entrada, se existirem (indicando se houve erro e mostrando o texto corrigido com a explicação didática).
6. GERAR 2 a 3 EXEMPLOS DE USO REAL NO DIA A DIA no idioma de destino "${targetLanguageName}" com tradução para Português.
7. DESMEMBRAR PALAVRAS DIFÍCEIS ou importantes com significado simples, pronúncia e exemplo.

Sempre responda estritamente em formato JSON de acordo com o esquema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Texto para traduzir:\n"${inputText}"\nIdioma Alvo: ${targetLanguageName}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: "Nome do idioma de entrada identificado automaticamente em português (ex: Inglês, Espanhol, Português)."
            },
            detectedLanguageCode: {
              type: Type.STRING,
              description: "Código ISO de 2 letras do idioma identificado (ex: en, es, pt, fr, de)."
            },
            translation: {
              type: Type.STRING,
              description: "Tradução precisa e natural do texto no idioma de destino selecionado."
            },
            phonetic: {
              type: Type.STRING,
              description: "Representação fonética escrita intuitiva entre barras ou parênteses de como se pronuncia a tradução."
            },
            explanation: {
              type: Type.STRING,
              description: "Explicação simples e acessível em português sobre o significado da expressão/frase."
            },
            grammarCorrections: {
              type: Type.OBJECT,
              description: "Análise gramatical do texto de entrada digitado pelo usuário.",
              properties: {
                hasError: {
                  type: Type.BOOLEAN,
                  description: "True se o texto original contiver erro ortográfico ou gramatical."
                },
                correctedOriginal: {
                  type: Type.STRING,
                  description: "Texto original corrigido. Deixe em branco se não houver erro."
                },
                explanation: {
                  type: Type.STRING,
                  description: "Explicação simples em português do erro corrigido. Deixe em branco se não houver erro."
                }
              },
              required: ["hasError", "correctedOriginal", "explanation"]
            },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "Frase de exemplo no idioma de destino." },
                  translation: { type: Type.STRING, description: "Tradução do exemplo em português." }
                },
                required: ["original", "translation"]
              },
              description: "2 a 3 exemplos práticos de uso do dia a dia."
            },
            difficultWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "A palavra destacada." },
                  meaning: { type: Type.STRING, description: "Significado em português simples." },
                  phonetic: { type: Type.STRING, description: "Pronúncia fonética escrita." },
                  example: { type: Type.STRING, description: "Frase de exemplo de uso." }
                },
                required: ["word", "meaning", "phonetic", "example"]
              },
              description: "Palavras mais difíceis ou expressões chaves desmembradas."
            }
          },
          required: ["detectedLanguage", "detectedLanguageCode", "translation", "phonetic", "explanation", "grammarCorrections", "examples", "difficultWords"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini não retornou dados da tradução." });
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Erro na rota /api/translate:", error);
    res.status(500).json({ error: error.message || "Erro interno ao traduzir." });
  }
});

// Endpoint: "Aprender com IA" Deep Explanation
app.post("/api/explain", async (req, res) => {
  try {
    const { text: queryText, targetLanguageName } = req.body;

    if (!queryText) {
      return res.status(400).json({ error: "Palavra ou expressão é obrigatória." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `
Você é o professor particular de IA do LingoConversa.
O usuário quer APRENDER COM IA sobre a palavra, frase, gíria ou expressão: "${queryText}" (idioma alvo de estudos: ${targetLanguageName || "Geral"}).

Sua missão é explicar como um professor apaixonado, simples e direto:
1. Dar a definição/significado exato.
2. Identificar a categoria gramatical (substantivo, gíria, expressão idiomática, verbo phrasal, etc.).
3. Explicar com linguagem simples e clara em português.
4. Explicar em que contextos reais essa expressão é usada (situação formal, informal, trabalho, redes sociais, etc.).
5. Se aplicável, incluir uma nota de nuance cultural ou curiosidade linguística.
6. Fornecer 3 exemplos práticos e envolventes com tradução.
7. Dar uma dica mnemónica divertida/visual para o aluno nunca mais esquecer.

Retorne em JSON estruturado de acordo com o esquema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Explique detalhadamente: "${queryText}"` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meaning: { type: Type.STRING, description: "Definição direta em português." },
            grammaticalCategory: { type: Type.STRING, description: "Categoria gramatical ou tipo de expressão (ex: Gíria informal, Phrasal Verb, Substantivo)." },
            simpleExplanation: { type: Type.STRING, description: "Explicação detalhada e simples em português como um professor explicando ao aluno." },
            usageContext: { type: Type.STRING, description: "Quando e onde usar esta palavra/expressão." },
            culturalNote: { type: Type.STRING, description: "Nota cultural ou curiosidade relevante (opcional/se aplicável)." },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sentence: { type: Type.STRING, description: "Frase de exemplo no idioma de estudo." },
                  translation: { type: Type.STRING, description: "Tradução em português." }
                },
                required: ["sentence", "translation"]
              },
              description: "3 exemplos de uso real."
            },
            mnemonicTip: { type: Type.STRING, description: "Dica mnemónica ou truque mental para memorizar facilmente." }
          },
          required: ["meaning", "grammaticalCategory", "simpleExplanation", "usageContext", "culturalNote", "examples", "mnemonicTip"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini não retornou dados de explicação." });
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Erro na rota /api/explain:", error);
    res.status(500).json({ error: error.message || "Erro interno ao explicar com IA." });
  }
});

// Endpoint: AI Audio Speech Transcription (Microphone Recording to Text)
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "Áudio é obrigatório para transcrição." });
    }

    const ai = getGeminiClient();

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioBase64
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          parts: [
            audioPart,
            { text: "Transcreva com máxima fidelidade e exatidão o áudio falado. Identifique também o idioma falado. Retorne JSON com os campos 'text' e 'detectedLanguage'." }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "A transcrição textual exata do áudio gravado." },
            detectedLanguage: { type: Type.STRING, description: "O idioma detectado no áudio em português." }
          },
          required: ["text", "detectedLanguage"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini não retornou dados da transcrição." });
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Erro na rota /api/transcribe:", error);
    res.status(500).json({ error: error.message || "Erro interno ao transcrever áudio." });
  }
});


// Configure Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LingoConversa Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
