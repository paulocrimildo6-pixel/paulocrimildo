import { LanguageOption, Scenario } from "./types";
import { ALL_LANGUAGES } from "./data/languages";

export { ALL_LANGUAGES };

export const LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "Inglês",
    nativeName: "English",
    flag: "🇬🇧",
    speechLocale: "en-US",
    welcomeMessage: "Hello! I'm your English tutor. Let's practice speaking today! What would you like to discuss?",
  },
  {
    code: "es",
    name: "Espanhol",
    nativeName: "Español",
    flag: "🇪🇸",
    speechLocale: "es-ES",
    welcomeMessage: "¡Hola! Soy teu tutor de español. ¡Vamos a practicar conversación hoy! ¿De qué te gustaría hablar?",
  },
  {
    code: "fr",
    name: "Francês",
    nativeName: "Français",
    flag: "🇫🇷",
    speechLocale: "fr-FR",
    welcomeMessage: "Bonjour ! Je suis ton tuteur de français. Pratiquons notre conversation aujourd'hui ! De quoi aimerais-tu parler ?",
  },
  {
    code: "it",
    name: "Italiano",
    nativeName: "Italiano",
    flag: "🇮🇹",
    speechLocale: "it-IT",
    welcomeMessage: "Ciao! Sono il tuo tutor d'italiano. Pratichiamo la conversazione oggi! Di cosa ti piacerebbe parlare?",
  },
  {
    code: "de",
    name: "Alemão",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    speechLocale: "de-DE",
    welcomeMessage: "Hallo! Ich bin dein Deutsch-Tutor. Lass uns heute Konversation üben! Worüber möchtest du sprechen?",
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "social",
    title: "Pequena Conversa Social",
    description: "Pratica apresentações e conversa fiada para conhecer uma pessoa nova num café de forma espontânea.",
    icon: "MessageSquare",
    recommendedLevel: "Iniciante",
    objective: "Introduce yourself, share your hobbies, and ask about the other person's favorite drink.",
    objectivePt: "Apresenta-te, partilha os teus passatempos e pergunta qual é a bebida preferida da outra pessoa.",
    isFree: true,
    initialPrompt: "Act as a friendly person named Alex sitting next to the student in a cozy café. Ask for their name, where they are from, what hobbies they enjoy, and keep the small talk natural, engaging, and light. Encourage them.",
    targetLanguagePrompts: {
      en: "Hi there! Mind if I sit here? It's really crowded today. By the way, I'm Alex. What's your name?",
      es: "¡Hola! ¿Te importa si me siento aquí? Está muy lleno hoy. Por cierto, soy Álex. ¿Cómo te llamas?",
      fr: "Salut ! Ça te dérange si je m'installe ici ? C'est très animé aujourd'hui. Au fait, je m'appelle Alex. Quel est ton nom ?",
      it: "Ciao! Ti dispiace se mi siedo qui? C'è molta gente oggi. A proposito, sono Alex. Come ti chiami?",
      de: "Hallo! Stört es dich, wenn ich mich hierher setze? Es ist heute sehr voll. Übrigens, ich bin Alex. Wie heißt du?"
    }
  },
  {
    id: "restaurant",
    title: "Pedir Comida no Restaurante",
    description: "Pede um prato saboroso ao empregado e reclama educadamente de um erro na tua conta.",
    icon: "Utensils",
    recommendedLevel: "Intermediário",
    objective: "Order a delicious dish and a drink, and gently point out an incorrect item or extra charge on your bill.",
    objectivePt: "Pede um prato delicioso e uma bebida, e assinala gentilmente um item incorreto ou cobrança extra na tua conta.",
    isFree: true,
    initialPrompt: "Act as a polite restaurant waiter named Jean-Pierre. Recommend a special dish, take the student's order, and handle their polite complaint about an extra charge on the final bill gracefully.",
    targetLanguagePrompts: {
      en: "Good evening! Welcome to Bistro Paris. I can highly recommend our homemade lasagna today. What can I get started for you?",
      es: "¡Buenas noches! Bienvenido al Bistro París. Le recomiendo mucho nuestra lasaña casera hoy. ¿Qué le pongo para empezar?",
      fr: "Bonsoir ! Bienvenue au Bistro Paris. Je vous recommande vivement nos lasagnes maison aujourd'hui. Que puis-je vous servir pour commencer ?",
      it: "Buonasera! Benvenuto al Bistro Paris. Vi consiglio caldamente le nostre lasagne fatte in casa oggi. Cosa posso portarvi per iniziare?",
      de: "Guten Abend! Willkommen im Bistro Paris. Ich kann Ihnen heute unsere hausgemachte Lasagne sehr empfehlen. Was darf ich Ihnen für den Anfang bringen?"
    }
  },
  {
    id: "airport",
    title: "Mala Perdida no Aeroporto",
    description: "Perdeste a tua bagagem e precisas de reportar a situação ao funcionário do aeroporto.",
    icon: "PlaneTakeoff",
    recommendedLevel: "Iniciante",
    objective: "Report your lost bag, describe its color, size, and brand, and leave your hotel contact address.",
    objectivePt: "Reporta a tua mala perdida, descreve a sua cor, tamanho e marca, e deixa o endereço de contacto do teu hotel.",
    isFree: false,
    initialPrompt: "Act as an airport luggage service agent. The student's bag is lost. Be professional, ask for their flight number, description of the bag, and contact info.",
    targetLanguagePrompts: {
      en: "Hello, welcome to Luggage Services. How can I assist you with your baggage claim today?",
      es: "Hola, bienvenido al servicio de equipajes. ¿En qué puedo ayudarle con su reclamo de equipaje hoy?",
      fr: "Bonjour, bienvenue au service des bagages. Comment puis-je vous aider avec votre réclamation aujourd'hui ?",
      it: "Buongiorno, benvenuto al servizio bagagli. Come posso aiutarla oggi con il suo reclamo ?",
      de: "Hallo, willkommen beim Gepäckservice. Wie kann ich Ihnen heute bei Ihrer Gepäckreklamation helfen?"
    }
  },
  {
    id: "job_interview",
    title: "Entrevista de Emprego",
    description: "Estás a fazer uma entrevista de emprego para uma vaga internacional emocionante.",
    icon: "Briefcase",
    recommendedLevel: "Avançado",
    objective: "Introduce your work background, explain your greatest professional strength, and ask about the team's working style.",
    objectivePt: "Apresenta o teu percurso de trabalho, explica a tua maior força profissional e pergunta sobre o estilo de trabalho da equipa.",
    isFree: false,
    initialPrompt: "Act as a friendly but formal corporate interviewer named Ms. Sarah. Ask the student about their experience, their strengths, and why they want this position.",
    targetLanguagePrompts: {
      en: "Thank you for coming in today. To start, could you please tell me a little bit about yourself and your professional background?",
      es: "Gracias por venir hoy. Para empezar, ¿podría contarme un poco sobre usted y su trayectoria profesional?",
      fr: "Merci d'être venu aujourd'hui. Pour commencer, pourriez-vous me parler un peu de vous et de votre parcours professionnel ?",
      it: "Grazie per essere venuto oggi. Per iniziare, potrebbe parlarmi un po' di lei e del suo percorso professionale?",
      de: "Vielen Dank, dass Sie heute gekommen sind. Könnten Sie mir zu Beginn ein wenig über sich und Ihren beruflichen Werdegang erzählen?"
    }
  },
  {
    id: "shopping",
    title: "Fazendo Compras",
    description: "Compra uma roupa elegante, pergunta pelo preço, pede um desconto e tenta devolver outro produto.",
    icon: "ShoppingBag",
    recommendedLevel: "Iniciante",
    objective: "Find a suitable jacket, negotiate a small discount, and ask to return a previous item with your receipt.",
    objectivePt: "Encontra um casaco adequado, negoceia um pequeno desconto e pede para devolver um artigo anterior com o recibo.",
    isFree: false,
    initialPrompt: "Act as an energetic shop assistant in a fashion boutique. Help the student find a jacket, negotiate the price if they ask, and help them process a return for a shirt with a receipt.",
    targetLanguagePrompts: {
      en: "Hello! Welcome to Trend Studio. We have some amazing jackets on sale today. Let me know if you are looking for a specific size or color!",
      es: "¡Hola! Bienvenido a Trend Studio. Tenemos chaquetas increíbles en oferta hoy. ¡Dígame si busca alguna talla o color en específico!",
      fr: "Bonjour ! Bienvenue chez Trend Studio. Nous avons de superbes vestes en promotion aujourd'hui. Dites-moi si vous cherchez une taille ou une couleur spécifique !",
      it: "Ciao! Benvenuto da Trend Studio. Oggi abbiamo delle giacche fantastiche in saldo. Fammi sapere se cerchi una taglia o un colore in particolare!",
      de: "Hallo! Willkommen im Trend Studio. Wir haben heute einige tolle Jacken im Angebot. Lassen Sie mich wissen, wenn Sie eine bestimmte Größe oder Farbe suchen!"
    }
  },
  {
    id: "doctor",
    title: "No Médico",
    description: "Descreve os teus sintomas e histórico médico ao doutor para receber a receita correta.",
    icon: "Stethoscope",
    recommendedLevel: "Avançado",
    objective: "Explain your severe headache and fever symptoms, mention when they started, and ask how often you should take the medicine.",
    objectivePt: "Explica os teus sintomas de forte dor de cabeça e febre, refere quando começaram e pergunta com que frequência deves tomar o medicamento.",
    isFree: false,
    initialPrompt: "Act as a caring and professional physician named Dr. Marcus. Ask the patient about their symptoms, how long they have been feeling sick, perform a virtual check, and prescribe a treatment explaining how to use it.",
    targetLanguagePrompts: {
      en: "Hello, please take a seat. I'm Dr. Marcus. What symptoms are you experiencing today that brought you in?",
      es: "Hola, por favor tome asiento. Soy el Dr. Marcus. ¿Qué síntomas tiene hoy que le han traído a la consulta?",
      fr: "Bonjour, asseyez-vous je vous en prie. Je suis le Dr Marcus. Quels symptômes ressentez-vous aujourd'hui qui vous amènent ?",
      it: "Buongiorno, si comodi. Sono il dottor Marcus. Quali sintomi accusa oggi che l'hanno spinta a venire in studio?",
      de: "Guten Tag, bitte nehmen Sie Platz. Ich bin Dr. Marcus. Welche Symptome haben Sie heute, die Sie in meine Praxis führen?"
    }
  }
];
