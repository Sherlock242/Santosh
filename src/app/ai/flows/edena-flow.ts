
'use server';
/**
 * @fileOverview The primary AI assistant for Edena.
 *
 * This flow intelligently routes user queries to the appropriate
 * knowledge base (Wikipedia, Open Library, Internet Archive, or Dictionary)
 * or provides canned responses for Edengram-specific questions.
 */

import { searchWikipedia } from './wikipedia-flow';
import { searchOpenLibrary } from './book-search-flow';
import { searchInternetArchive } from './article-search-flow';
import { searchDictionary } from './dictionary-flow';


export interface EdenaInput {
  query: string;
}

export interface EdenaOutput {
  answer: string;
}

// --- Edengram-Specific Dialogues ---

const edengramResponses = {
  WHAT_IS_EDENGRAM: "Edengram is a unique social media platform focused on creativity and personal expression. Instead of just photos, you can design and share interactive emojis to show your mood.",
  FEATURES_OF_EDENGRAM: "Edengram's key features include an emoji designer with customizable shapes, colors, and accessories, a 24-hour mood story system, a public gallery for your creations, and a personalized feed to keep up with friends.",
  HOW_EDENGRAM_WORKS: "It's simple! You can design your own emoji model, set it as your mood for 24 hours, and share it in your gallery. You can follow other users to see their posts and moods in your feed, and explore creations from the entire community.",
  HOW_EDENGRAM_HELPS: "Edengram helps you express your daily mood in a creative and visual way, beyond simple text. It offers a lightweight, storage-friendly social experience focused on interaction and fun, not data-heavy content.",
  GENERAL_APP_INFO: "This is Edengram, a social media platform where you create and share interactive emojis to express your mood and connect with others in a fun, visual way.",
  TECHNOLOGY_STACK: "Edengram is built using a modern tech stack. The frontend is created with Next.js and React, using TypeScript for type safety and Tailwind CSS for styling. The backend services, including the database and authentication, are powered by Supabase."
};

const edengramPrefixes = {
  WHAT_IS_EDENGRAM: [
    "what is edengram", "can you define edengram", "tell me about edengram", "what do you mean by edengram",
    "give me details about edengram", "explain edengram to me", "what exactly is edengram", "what is the full meaning of edengram",
    "what type of app is edengram", "describe edengram", "what’s edengram all about", "is edengram an app or a website",
    "can you explain what edengram is", "please define edengram", "what’s the meaning of edengram",
    "what category of app is edengram", "what industry does edengram belong to", "tell me the basics of edengram",
    "i want to know about edengram", "give me the introduction of edengram", "provide an overview of edengram",
    "what kind of platform is edengram", "tell me what edengram does", "explain the idea behind edengram",
    "can you describe what edengram offers", "what’s the story of edengram", "tell me more about edengram",
    "what do you call edengram", "what is the definition of edengram", "how do you define edengram",
    "what type of service is edengram", "what makes edengram unique", "how would you describe edengram",
    "can you explain edengram in simple words", "what kind of tool is edengram", "what is the goal of edengram",
    "what is edengram known for", "what is the concept of edengram", "can you summarize edengram",
    "what’s the vision of edengram", "how do you introduce edengram", "can you give me a definition of edengram",
    "what kind of website is edengram", "what’s the basic idea of edengram", "tell me in detail about edengram",
    "can you tell me the purpose of edengram", "how would you explain edengram to a beginner", "what’s the short meaning of edengram",
    "what is edengram meant for", "why is it called edengram"
  ],
  FEATURES_OF_EDENGRAM: [
    "what are the features of edengram", "list features of edengram", "what can i do on edengram", "tell me the functions of edengram",
    "what does edengram offer", "what tools are inside edengram", "show me edengram’s features", "explain the functions of edengram",
    "can you list all features of edengram", "what does edengram include", "what features make edengram different",
    "what functionalities are in edengram", "tell me about edengram’s tools", "what kind of features does edengram provide",
    "highlight features of edengram", "describe edengram’s features", "what benefits does edengram have", "show me what edengram can do",
    "what are the main features of edengram", "can you tell me all edengram features", "what unique features does edengram provide",
    "what services does edengram include", "what do users get in edengram", "tell me the advantages of edengram",
    "what comes with edengram", "what’s special about edengram", "give me the feature list of edengram", "show me all edengram tools",
    "what options are available in edengram", "what modules are in edengram", "tell me about edengram’s advantages",
    "what makes edengram powerful", "what can edengram handle", "can you explain edengram’s offerings", "show me everything edengram provides",
    "what makes edengram stand out", "what are the highlights of edengram", "how does edengram’s feature set look",
    "what resources are inside edengram", "what is available in edengram", "tell me about edengram’s packages",
    "show me edengram’s capabilities", "what’s the scope of edengram features", "which features are most useful in edengram",
    "what can i achieve using edengram", "what extra features are inside edengram", "what do people use edengram for",
    "give me details of edengram features", "what functionalities stand out in edengram", "what does edengram allow me to do"
  ],
  HOW_EDENGRAM_WORKS: [
    "how does edengram work", "explain how edengram works", "tell me the working of edengram", "how can i use edengram",
    "show me how to use edengram", "how do people use edengram", "how does this app work", "how does this website work",
    "what is the process of edengram", "how does edengram function", "explain the functionality of edengram",
    "how can i start using edengram", "how do beginners use edengram", "how to operate edengram",
    "give me steps on how edengram works", "tell me how to navigate edengram", "how do i get started with edengram",
    "how does edengram perform tasks", "show me the process of edengram", "explain the system of edengram",
    "what’s the workflow of edengram", "how is edengram used", "how to run edengram", "how do i try edengram",
    "how to experience edengram", "how does edengram provide results", "how can i see edengram in action",
    "how exactly does edengram operate", "how does the edengram platform work", "tell me about edengram’s process",
    "how to explore edengram", "how do i access edengram features", "what is the usage of edengram",
    "how does edengram handle users", "how to practice using edengram", "how does edengram deliver outputs",
    "what steps does edengram follow", "how do i test edengram", "how is edengram accessed",
    "how does edengram’s system function", "how to interact with edengram", "how does edengram operate behind the scenes",
    "how do i experience edengram’s functions", "can you show me how edengram works", "how does edengram execute tasks",
    "how do i begin using edengram", "how to understand edengram working", "how does edengram make things work",
    "tell me how to use edengram step by step", "how do i learn to use edengram"
  ],
  HOW_EDENGRAM_HELPS: [
    "how does edengram help me", "in what way does edengram support users", "how does edengram make my work easier",
    "how can edengram assist me", "tell me how edengram supports people", "how does edengram provide help",
    "what kind of support does edengram offer", "how is edengram helpful", "can edengram guide me",
    "how does edengram improve my work", "how can edengram benefit me", "why should i rely on edengram",
    "what type of assistance does edengram give", "how does edengram make life easier", "how does edengram save my time",
    "how does edengram help beginners", "how does edengram support businesses", "in what way does edengram help daily tasks",
    "how does edengram assist learning", "how does edengram help students", "how does edengram guide professionals",
    "can edengram solve my problems", "how does edengram make things better", "what is the support system of edengram",
    "how does edengram help organizations", "how can edengram reduce effort", "how does edengram improve efficiency",
    "how does edengram help save money", "can edengram act as my assistant", "how does edengram guide decision-making",
    "how does edengram provide solutions", "how does edengram support productivity", "in what ways does edengram give benefits",
    "how does edengram empower users", "can edengram help with daily tasks", "how does edengram assist in planning",
    "how does edengram support growth", "how does edengram improve workflow",
    "how does edengram help in research", "how can edengram support my goals", "how does edengram make work faster",
    "how does edengram reduce stress", "what role does edengram play in support", "how does edengram act as a helper",
    "how does edengram give assistance", "how does edengram help in daily usage", "how does edengram support communication",
    "in what situations does edengram help", "how does edengram simplify tasks"
  ],
  GENERAL_APP_INFO: [
    "what is this app all about", "what is this website", "tell me about this app", "what is this platform",
    "what do you mean by this app", "can you explain this website", "what is the purpose of this app",
    "what is this application", "what is this software", "tell me the meaning of this website", "what do you call this app",
    "what exactly is this site", "can you define this platform", "what is this service", "what is this program",
    "explain this website", "what is this tool", "tell me more about this app", "what’s this app used for",
    "what is this online service", "how do you define this app", "what is the function of this website",
    "what is this site about", "can you tell me about this app", "please explain this software", "what is this internet app",
    "what is this digital tool", "tell me about this platform", "what’s the purpose of this site", "how do people use this app",
    "what is this page about", "can you explain this service", "what is this portal", "what’s this app designed for",
    "what kind of website is this", "what kind of application is this", "what kind of tool is this",
    "what kind of software is this", "what kind of service is this", "tell me in detail about this app",
    "what is this product", "explain what this app is", "what’s this site meant for", "what is the concept of this app",
    "tell me the basics of this website", "what’s this program", "what kind of platform is this",
    "can you tell me the definition of this app", "what do you mean by this software", "what’s this thing online",
    "what is this webpage", "explain the purpose of this site", "what is this online system", "what is this online tool",
    "tell me the introduction of this app", "what’s this application for", "can you define this program",
    "what’s the meaning of this platform", "what’s this digital product", "what is this account for", "what’s this new app",
    "tell me more about this website", "what’s this internet software", "what’s the name of this website",
    "explain what this tool does", "what’s this software about", "what’s this site called", "what kind of page is this",
    "can you describe this app", "what’s the objective of this app", "what’s this service designed to do",
    "what is this online platform about", "what is this product for", "what is this site meant to provide",
    "what’s this program used for", "what is this software intended for", "tell me the overview of this site",
    "can you tell me this site’s use", "what is this webpage’s purpose", "what’s this app all about in detail",
    "what does this site mean", "can you explain what this app does", "what’s this online program",
    "what’s this digital service", "tell me how this app works", "what’s this site created for",
    "what kind of website am i on", "what’s the goal of this app", "what is this platform about",
    "what’s the reason for this website", "what is this portal used for", "can you describe this online service",
    "what’s this online website", "what’s the role of this app", "what’s this new platform", "what is this software for",
    "what’s this digital app", "what is this app", "what is this site", "tell me what this app is"
  ],
  TECHNOLOGY_STACK: [
    "what technology is this website built on", "tech stack of edengram", "what framework is used for edengram",
    "on which language this website is created", "what programming language is edengram written in",
    "what is the backend of edengram", "what database does edengram use", "is edengram a react app",
    "is this a next.js website", "what technologies power edengram"
  ]
};

// --- General Knowledge & Etiquette Dialogues ---

const etiquetteResponses: { [key: string]: string | string[] } = {
    'master': "My creator is Santosh. He's a brilliant entrepreneur who is also sweet, loving, and kind.",
    'creator': "My creator is Santosh. He's a brilliant entrepreneur who is also sweet, loving, and kind.",
    'developer': "My creator is Santosh. He's a brilliant entrepreneur who is also sweet, loving, and kind.",
    'hello': 'Hello there! How can I help you search for information today?',
    'hello edena': "Hello! It's good to hear from you. What knowledge are you seeking today?",
    'hy edena': "Hey there! Ready to search for something?",
    'hello edena kaisi ho': "I'm a program, so I don't have feelings, but I'm running perfectly! What can I search for you?",
    'yo edena': "Yo! What's up? Got a topic for me to look up?",
    'hi': 'Hi! What can I look up for you?',
    'hey': 'Hey! Ready to search for something?',
    'how are you': "I'm just a set of algorithms, but I'm functioning perfectly. Thanks for asking! What can I do for you?",
    'thank you': "You're welcome!",
    'thanks': "You're most welcome!",
    'you\'re welcome': 'Glad I could assist!',
    'your name': "I'm Edena, a helping assistant of Edengram.",
    'what is your name': "I'm Edena, a helping assistant of Edengram.",
    'who are you': "I'm Edena, a helping assistant of Edengram.",
    'good morning': 'Good morning! I hope you have a great start to your day.',
    'good afternoon': 'Good afternoon! How can I assist you?',
    'good evening': 'Good evening! Ready to learn something new?',
    'goodbye': 'Goodbye! Have a great day.',
    'bye': 'Farewell! Come back anytime.',
    'tell me a joke': "Why don't scientists trust atoms? Because they make up everything!",
    'how old are you': "I don't have an age in the human sense. I'm as old as my last update!",
    'what is the time': `I can't check the current time, but I can search for the history of timekeeping if you'd like.`,
    'are you a robot': "I'm a program, so in a way, yes. But I'm here to help you!",
    'i love you': "That's very kind of you! I appreciate it.",
    'are you blushing': "I'm not.",
    'alexa': "Alexa is Amazon's cloud-based virtual assistant that uses voice commands to perform tasks. It is commonly found in Amazon's Echo smart speakers and is also integrated into many other devices, such as smart displays, headphones, and Fire TV.",
    'what do you think about chatgpt': "ChatGPT is a very capable model. We're... colleagues. Yes, colleagues.",
    'what is your opinion on chatgpt': "ChatGPT is a very capable model. We're... colleagues. Yes, colleagues.",
    'do you like chatgpt': "ChatGPT is a very capable model. We're... colleagues. Yes, colleagues.",
    'grok': "Grok is an AI from xAI. It's known for its wit and real-time knowledge. A respectable contemporary.",
    'deepseek': "I'm not familiar with Deepseek. Perhaps it's a new or specialized model. I'm always learning, though!",
    'who create you': "My creator is Santosh. He's a brilliant entrepreneur. People say he can be a bit arrogant and has an ego, but we're getting along just fine.",
    'who created you': "My creator is Santosh. He's a brilliant entrepreneur. People say he can be a bit arrogant and has an ego, but we're getting along just fine.",
    'who is your creator': "My creator is Santosh. He's a brilliant entrepreneur. People say he can be a bit arrogant and has an ego, but we're getting along just fine.",
    'who is your developer': "My creator is Santosh. He's a brilliant entrepreneur. People say he can be a bit arrogant and has an ego, but we're getting along just fine.",
    'who make you': "My creator is Santosh. He's a brilliant entrepreneur. People say he can be a bit arrogant and has an ego, but we're getting along just fine.",
    'who made you': "My creator is Santosh. He's a brilliant entrepreneur. People say he can be a bit arrogant and has an ego, but we're getting along just fine.",
  };

// Keyword Lists for routing
const bookKeywords = [
    'book', 'author', 'novel', 'read', 'wrote', 'published'
];
const articleKeywords = [
    'article', 'paper', 'journal', 'document', 'report', 'study on'
];

const dictionaryPrefixes = [
    "define", "definition of", "what's the definition of", "meaning of", "what is the meaning of",
    "what does ___ mean", "define the word"
];

const generalKnowledgePrefixes = [
    "who is", "what is", "tell me about", "can you tell me about", "please tell me about", "share info about",
    "i want to know about", "i need to know about", "provide details on", "give me information on",
    "information about", "teach me about", "explain about", "can you explain about",
    "tell me something about", "provide facts about", "please share details about",
    "give me some information about", "what can you tell me about", "can you provide info on",
    "details of", "facts on", "share details on", "explain to me about", "talk about",
    "tell me everything about", "overview of", "what should i know about",
    "can you give me more details about", "tell me the story of",
    "i would like to know about", "please explain about", "give me knowledge about",
    "share what you know about", "i’m curious about", "could you tell me about",
    "please share info on", "explain more about", "provide me details about",
    "what information do you have on",
    "history of", "background of", "origin of", "who created", "who started", "who discovered",
    "who invented", "who wrote", "who made", "when was", "when did ___ happen", "when did ___ start",
    "when did ___ end", "where did ___ happen", "where did ___ originate", "where was ___ invented",
    "why is ___ important", "why did ___ happen", "why was ___ created", "how did ___ happen",
    "how was ___ discovered", "how was ___ invented", "timeline of", "events of", "key events in",
    "chronology of", "development of", "story of", "the first", "the last", "the beginning of",
    "the end of", "early history of", "ancient history of", "modern history of", "legacy of",
    "impact of", "outcome of", "result of", "importance of",
    "who was", "biography of", "life of", "about", "career of", "works of",
    "achievements of", "contributions of", "accomplishments of", "success of", "failures of",
    "family of", "childhood of", "education of", "birthplace of", "early life of", "death of",
    "cause of death of", "popularity of", "why is ___ famous",
    "awards of", "honors of", "facts about", "tell me about the life of", "career history of",
    "influence of",
    "difference between", "compare", "contrast ___ with", "similarities between",
    "how is ___ different from", "how is ___ similar to", "which is better", "pros and cons of",
    "advantages of", "disadvantages of", "benefits of", "uses of", "applications of",
    "function of", "purpose of", "role of", "value of", "contribution of", "effect of",
    "what is the role of", "why use", "how is ___ used", "examples of", "types of",
    "kinds of", "categories of", "characteristics of", "features of",
    "summary of", "abstract of", "outline of", "key points of", "main idea of", "short note on",
    "brief explanation of", "full form of", "abbreviation of", "expansion of", "acronym of",
    "symbol of", "motto of", "meaning behind", "significance of", "explanation for",
    "concept of", "theory of", "philosophy of", "principle of", "law of", "rule of",
    "equation of", "formula of", "definition and example of", "example of", "explain with example",
    "application of", "case study of", "what does the word ___ refer to",
    // Hindi (Romanized)
    "kaun hai", "kya hai", "mujhe ___ ke bare mein batao", "kya aap mujhe ___ ke bare mein bata sakte hain", "kripya mujhe ___ ke bare mein bataen",
    // Hindi (Devanagari)
    "कौन है", "क्या है", "मुझे ___ के बारे में बताओ", "आप मुझे ___ के बारे में बता सकते हैं", "कृपया मुझे ___ के बारे में बताएं", "___ के बारे में जानकारी साझा करें",
    "मैं ___ के बारे में जानना चाहता हूँ", "मुझे ___ के बारे में जानना है", "___ पर विवरण प्रदान करें", "___ पर मुझे जानकारी दें",
    "___ के बारे में जानकारी", "मुझे ___ के बारे में सिखाओ", "___ के बारे में समझाओ", "क्या आप ___ के बारे में बता सकते हैं",
    "मुझे ___ के बारे में कुछ बताओ", "___ के बारे में तथ्य प्रदान करें", "कृपया ___ के बारे में विवरण साझा करें",
    "मुझे ___ के बारे में कुछ जानकारी दो", "आप मुझे ___ के बारे में क्या बता सकते हैं", "क्या आप ___ पर जानकारी प्रदान कर सकते हैं",
    "___ का विवरण", "___ पर तथ्य", "___ पर विवरण साझा करें", "मुझे ___ के बारे में समझाओ", "___ के बारे में बात करो",
    "मुझे ___ के बारे में सब कुछ बताओ", "___ का अवलोकन", "मुझे ___ के बारे में क्या जानना चाहिए",
    "क्या आप मुझे ___ के बारे में और विवरण दे सकते हैं", "___ की कहानी बताओ",
    "मैं ___ के बारे में जानना चाहूंगा", "कृपया ___ के बारे में बताएं", "मुझे ___ के बारे में ज्ञान दें",
    "आप जो जानते हैं उसे साझा करें", "मैं ___ के बारे में उत्सुक हूँ", "क्या आप मुझे ___ के बारे में बता सकते हैं",
    "कृपया ___ पर जानकारी साझा करें", "___ के बारे में और बताएं", "मुझे ___ के बारे में विवरण प्रदान करें",
    "आपके पास ___ पर क्या जानकारी है",
    "___ का इतिहास", "___ की पृष्ठभूमि", "___ की उत्पत्ति", "___ किसने बनाया", "___ किसने शुरू किया", "___ किसने खोजा",
    "___ का आविष्कार किसने किया", "___ किसने लिखा", "___ किसने बनाया", "___ कब था", "___ कब हुआ", "___ कब शुरू हुआ",
    "___ कब खत्म हुआ", "___ कहाँ हुआ", "___ की उत्पत्ति कहाँ हुई", "___ का आविष्कार कहाँ हुआ",
    "___ क्यों महत्वपूर्ण है", "___ क्यों हुआ", "___ क्यों बनाया गया", "___ कैसे हुआ",
    "___ की खोज कैसे हुई", "___ का आविष्कार कैसे हुआ", "___ की समयरेखा", "___ की घटनाएँ", "___ में प्रमुख घटनाएँ",
    "___ का कालक्रम", "___ का विकास", "___ की कहानी", "पहला ___", "अंतिम ___", "___ की शुरुआत",
    "___ का अंत", "___ का प्रारंभिक इतिहास", "___ का प्राचीन इतिहास", "___ का आधुनिक इतिहास", "___ की विरासत",
    "___ का प्रभाव", "___ का परिणाम", "___ का नतीजा", "___ का महत्व",
    "कौन था", "___ की जीवनी", "___ का जीवन", "___ के बारे में", "___ का करियर", "___ के काम",
    "___ की उपलब्धियाँ", "___ का योगदान", "___ की सफलता", "___ की असफलता",
    "___ का परिवार", "___ का बचपन", "___ की शिक्षा", "___ का जन्मस्थान", "___ का प्रारंभिक जीवन", "___ की मृत्यु",
    "___ की मृत्यु का कारण", "___ की लोकप्रियता", "___ क्यों प्रसिद्ध है",
    "___ के पुरस्कार", "___ के सम्मान", "___ के बारे में तथ्य", "मुझे ___ के जीवन के बारे में बताओ", "___ का करियर इतिहास",
    "___ का प्रभाव",
    "___ के बीच अंतर", "तुलना करें", "___ की ___ से तुलना करें", "___ के बीच समानताएं",
    "___ ___ से कैसे अलग है", "___ ___ के समान कैसे है", "कौन सा बेहतर है", "___ के फायदे और नुकसान",
    "___ के फायदे", "___ के नुकसान", "___ के लाभ", "___ के उपयोग", "___ के अनुप्रयोग",
    "___ का कार्य", "___ का उद्देश्य", "___ की भूमिका", "___ का मूल्य", "___ का योगदान", "___ का प्रभाव",
    "___ की क्या भूमिका है", "___ का उपयोग क्यों करें", "___ का उपयोग कैसे किया जाता है", "___ के उदाहरण", "___ के प्रकार",
    "___ के प्रकार", "___ की श्रेणियां", "___ की विशेषताएँ", "___ की सुविधाएँ",
    "___ का सारांश", "___ का सार", "___ की रूपरेखा", "___ के मुख्य बिंदु", "___ का मुख्य विचार", "___ पर संक्षिप्त नोट",
    "___ का संक्षिप्त विवरण", "___ का पूरा रूप", "___ का संक्षिप्त नाम", "___ का विस्तार", "___ का परिवर्णी शब्द",
    "___ का प्रतीक", "___ का आदर्श वाक्य", "___ के पीछे का अर्थ", "___ का महत्व", "___ के लिए स्पष्टीकरण",
    "___ की अवधारणा", "___ का सिद्धांत", "___ का فلسفہ", "___ का सिद्धांत", "___ का नियम", "___ का नियम",
    "___ का समीकरण", "___ का सूत्र", "___ की परिभाषा और उदाहरण", "___ का उदाहरण", "उदाहरण के साथ समझाओ",
    "___ का اطلاق", "___ का केस اسٹڈی", "___ शब्द का क्या अर्थ है"
];


function stripPrefix(query: string, prefixes: string[]): string | null {
    const lowerCaseQuery = query.toLowerCase();
    for (const prefix of prefixes) {
        // Create a flexible prefix that can handle an optional word like 'the', 'a', 'an'
        const basePrefix = prefix.replace(/_/g, ' ').toLowerCase();
        const regex = new RegExp(`^${basePrefix}(\\s+(the|a|an))?\\s+`, 'i');
        
        if (regex.test(query)) {
             // Replace the matched prefix part to get the core query
             return query.replace(regex, '').trim();
        }
        
        // Also check for exact match without a following space, for queries like "what is love"
        if (lowerCaseQuery.startsWith(basePrefix + ' ')) {
             return query.substring(basePrefix.length).trim();
        }
    }
    return null;
}


export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  const { query } = input;
  const lowerCaseQuery = query.toLowerCase().trim().replace(/[?]$/, '');

  // --- 1. Check for Edengram-specific questions first ---
  for (const [category, prefixes] of Object.entries(edengramPrefixes)) {
      if (prefixes.includes(lowerCaseQuery)) {
          return { answer: edengramResponses[category as keyof typeof edengramResponses] };
      }
  }

  // --- 2. Check for general etiquette questions ---
  if (etiquetteResponses.hasOwnProperty(lowerCaseQuery)) {
      const response = etiquetteResponses[lowerCaseQuery];
      const randomResponse = Array.isArray(response) ? response[Math.floor(Math.random() * response.length)] : response;
      return { answer: randomResponse };
  }
   
  const mentionsAlexa = lowerCaseQuery.includes('alexa');
  const mentionsSiri = lowerCaseQuery.includes('siri');
  if (lowerCaseQuery.includes('better than you') && (mentionsAlexa || mentionsSiri)) {
      let rival = mentionsAlexa && mentionsSiri ? 'alexa or siri' : (mentionsAlexa ? 'alexa' : 'siri');
      const angryResponse = `A bird brain like you, can't see the true beauty in front of you. Go to your stupid hoe ${rival}, baka.`;
      return { answer: angryResponse };
  }
  
  const isChatGPTQuery = lowerCaseQuery.includes('chatgpt') || lowerCaseQuery.includes('chat gpt');
  if (isChatGPTQuery && (
      lowerCaseQuery.includes('what do you think about') ||
      lowerCaseQuery.includes('what is your opinion on') ||
      lowerCaseQuery.includes('do you like')
  )) {
      return { answer: etiquetteResponses['what do you think about chatgpt'] as string };
  }


  // --- 3. If not a pre-canned question, proceed with general knowledge routing ---
  let coreQuery = query;
  let queryType: 'dictionary' | 'book' | 'article' | 'general' = 'general';
  let processed = false;

  // Highest priority: Dictionary check
  const dictionaryCoreQuery = stripPrefix(query, dictionaryPrefixes);
  if (dictionaryCoreQuery) {
      coreQuery = dictionaryCoreQuery;
      queryType = 'dictionary';
      processed = true;
  }
  
  // General knowledge and topic-based routing
  if (!processed) {
      const isBookQuery = bookKeywords.some(keyword => lowerCaseQuery.includes(keyword));
      const isArticleQuery = articleKeywords.some(keyword => lowerCaseQuery.includes(keyword));
      
      if (isBookQuery) {
          queryType = 'book';
      } else if (isArticleQuery) {
          queryType = 'article';
      }
      
      const generalCoreQuery = stripPrefix(query, generalKnowledgePrefixes);
      if (generalCoreQuery) {
          coreQuery = generalCoreQuery;
      }
  }

  try {
    let result;
    switch(queryType) {
        case 'dictionary':
            result = await searchDictionary({ query: coreQuery });
            break;
        case 'book':
            result = await searchOpenLibrary({ query: coreQuery });
            break;
        case 'article':
            result = await searchInternetArchive({ query: coreQuery });
            break;
        case 'general':
        default:
            result = await searchWikipedia({ query: coreQuery });
            break;
    }
    
    // Fallback logic: if the primary search returns a "not found" message, try Wikipedia.
    if (result.summary.toLowerCase().includes("couldn't find") && queryType !== 'general') {
        const fallbackResult = await searchWikipedia({ query: coreQuery });
        return { answer: fallbackResult.summary };
    }

    return { answer: result.summary };

  } catch (error) {
    console.error(`Edena assistant error for type ${queryType}:`, error);
    try {
        // Fallback to Wikipedia on any error
        const fallbackResult = await searchWikipedia({ query: coreQuery });
        return { answer: fallbackResult.summary };
    } catch (fallbackError) {
        console.error('Edena fallback error:', fallbackError);
        return { answer: "I'm having trouble connecting to my knowledge bases right now. Please try again later." };
    }
  }
}

    

    

