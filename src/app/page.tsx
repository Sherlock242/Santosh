
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { BrainCircuit, Mic, Sparkles, Volume2, ArrowRight, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { searchWikipedia } from './ai/flows/wikipedia-flow';
import { Input } from '@/components/ui/input';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

const AIConsciousnessPage = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [searchText, setSearchText] = useState('');
  const [aiResponse, setAiResponse] = useState("Click the orb to start a voice search.");
  const [dots, setDots] = useState('');
  const [isAngry, setIsAngry] = useState(false);
  const [isBlushing, setIsBlushing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const recognitionRef = useRef<any | null>(null);

  const speak = useCallback((text: string, angryMode: boolean = false, blushingMode: boolean = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    if (angryMode) setIsAngry(true);
    if (blushingMode) setIsBlushing(true);
    
    setAiResponse(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
        setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      if (angryMode) setIsAngry(false);
      if (blushingMode) setIsBlushing(false);
    };
    utterance.onerror = () => {
        setIsSpeaking(false);
        if (angryMode) setIsAngry(false);
        if (blushingMode) setIsBlushing(false);
    }
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    return () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }
  }, [])

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
    'what is edengram': "Edengram is a unique social media platform focused on creativity and personal expression. Instead of just photos, you can design and share interactive emojis to show your mood.",
    'how does edengram work': "It's simple! You can design your own emoji model, set it as your mood for 24 hours, and share it in your gallery. You can follow other users to see their posts and moods in your feed, and explore creations from the entire community.",
    'edengram features': "Edengram's key features include an emoji designer with customizable shapes, colors, and accessories, a 24-hour mood story system, a public gallery for your creations, and a personalized feed to keep up with friends.",
    'good morning': 'Good morning! I hope you have a great start to your day.',
    'good afternoon': 'Good afternoon! How can I assist you?',
    'good evening': 'Good evening! Ready to learn something new?',
    'goodbye': 'Goodbye! Have a great day.',
    'bye': 'Farewell! Come back anytime.',
    'what can you do': "I can search Wikipedia for any topic you're curious about. Just tell me what you want to know.",
    'how can you help me': "I can search Wikipedia for any topic you're curious about. Just tell me what you want to know.",
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

  const searchPrefixes = [
    "who is", "what is", "what are", "tell me about", "search for",
    "i want to know about", "can you tell me about", "information on",
    "who invented", "what invented", "what's"
  ];
  
  const executeSearch = async (query: string) => {
    if (!query) {
        speak("I didn't catch that. What would you like to search for?");
        return;
    }
    setIsLoading(true);
    setTranscript(''); // Clear transcript to show 'Thinking...'
    setAiResponse('');
    try {
      const response = await searchWikipedia({ query });
      speak(response.summary);
    } catch (error) {
      console.error('Error fetching from Wikipedia:', error);
      speak("I couldn't find information on that. Please try another topic.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleListen = () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsAngry(false);
        setIsBlushing(false);
        return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support the Web Speech API. Please try Chrome.');
      return;
    }

    const recognition = new (window as unknown as IWindow).webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setAiResponse('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setIsListening(false);
        recognition.stop();
        
        const normalizedTranscript = finalTranscript.toLowerCase().trim().replace(/[.,?_!]/g, '');

        // --- Start of Logic Flow ---

        // 1. Check for special hardcoded interactions first
        const mentionsAlexa = normalizedTranscript.includes('alexa');
        const mentionsSiri = normalizedTranscript.includes('siri');
        if (normalizedTranscript.includes('better than you') && (mentionsAlexa || mentionsSiri)) {
            let rival = mentionsAlexa && mentionsSiri ? 'alexa or siri' : (mentionsAlexa ? 'alexa' : 'siri');
            const angryResponse = `A bird brain like you, can't see the true beauty in front of you. Go to your stupid hoe ${rival}, baka.`;
            speak(angryResponse, true, false);
            return;
        }
        
        const isChatGPTQuery = normalizedTranscript.includes('chatgpt') || normalizedTranscript.includes('chat gpt');
        if (isChatGPTQuery && (
            normalizedTranscript.includes('what do you think about') ||
            normalizedTranscript.includes('what is your opinion on') ||
            normalizedTranscript.includes('do you like')
        )) {
            speak(etiquetteResponses['what do you think about chatgpt'] as string, false, true);
            return;
        }

        // 2. Check for prescripted conversational responses (exact match)
        if (etiquetteResponses.hasOwnProperty(normalizedTranscript)) {
            const response = etiquetteResponses[normalizedTranscript];
            const randomResponse = Array.isArray(response) ? response[Math.floor(Math.random() * response.length)] : response;
            speak(randomResponse);
            return;
        }

        // 3. Check for prefix-based search
        for (const prefix of searchPrefixes) {
            if (normalizedTranscript.startsWith(prefix + " ")) {
                const searchQuery = finalTranscript.substring(prefix.length + 1).trim();
                executeSearch(searchQuery);
                return;
            }
        }

        // 4. Fallback to direct search for one-word queries or any other complex sentence
        executeSearch(finalTranscript);
      }
    };

    recognition.start();
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      executeSearch(searchText);
      setSearchText('');
      setShowSearch(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  const ring1Color = isAngry ? 'rgba(255, 69, 0, 0.5)' : (isBlushing ? 'rgba(255, 182, 193, 0.5)' : 'rgba(0, 255, 255, 0.5)');
  const ring2Color = isAngry ? 'rgba(255, 69, 0, 0.6)' : (isBlushing ? 'rgba(255, 182, 193, 0.6)' : 'rgba(0, 255, 255, 0.6)');
  const ring3Color = isAngry ? 'rgba(255, 69, 0, 0.7)' : (isBlushing ? 'rgba(255, 182, 193, 0.7)' : 'rgba(0, 255, 255, 0.7)');
  const orbGradient = isAngry 
    ? 'linear-gradient(to bottom right, #FF4500, #FF8C00)' 
    : (isBlushing ? 'linear-gradient(to bottom right, #FFC0CB, #FFB6C1)' : 'linear-gradient(to bottom right, hsl(var(--primary)), #00BFFF)');
  const orbBoxShadow = isAngry
    ? '0 0 30px #FF4500, 0 0 15px #FF8C00'
    : (isBlushing ? '0 0 30px #FFC0CB, 0 0 15px #FFB6C1' : '0 0 30px #0ff, 0 0 15px hsl(var(--primary))');


  return (
    <div className="flex flex-col h-screen bg-black text-white p-4 overflow-hidden">
      <header className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-start max-w-xs">
              <h1 
                  className="font-jarvis text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary cursor-pointer"
                  onClick={() => setShowSearch(!showSearch)}
              >
                  EDENA
              </h1>
              <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="overflow-hidden w-full"
                >
                  <form onSubmit={handleManualSearch} className="flex items-center w-full mt-2">
                    <div className="relative flex-grow">
                      <Input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent border-0 border-b-2 border-cyan-400/50 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-cyan-400 text-white pl-0 pr-8"
                        autoFocus
                      />
                      <Button type="submit" variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 text-cyan-400/70 hover:text-cyan-400 h-8 w-8">
                          <Search size={20} />
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
            <Button asChild variant="link" className="text-white hover:text-cyan-400 transition-colors duration-300 p-0 h-auto hover:no-underline">
              <Link href="/login">
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        
        <div 
          className="relative flex items-center justify-center w-[40vw] h-[40vw] md:w-[25vw] md:h-[25vw] max-w-[300px] max-h-[300px] min-w-[240px] min-h-[240px] cursor-pointer"
          onClick={handleListen}
        >
             <AnimatePresence>
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={`particle-${i}`}
                        className="absolute bg-cyan-400/50 rounded-full"
                        style={{
                            width: `${Math.random() * 2 + 1}px`,
                            height: `${Math.random() * 2 + 1}px`,
                            top: '50%',
                            left: '50%',
                        }}
                        initial={{
                            x: (Math.random() - 0.5) * 220,
                            y: (Math.random() - 0.5) * 220,
                            scale: 0,
                        }}
                        animate={{ scale: [0, 1, 0] }}
                        transition={{
                            duration: Math.random() * 2 + 2,
                            repeat: Infinity,
                            delay: Math.random() * 4,
                            ease: 'easeInOut'
                        }}
                    />
                ))}
            </AnimatePresence>

            <motion.svg className="absolute w-[50%] h-[50%]" viewBox="0 0 300 300" initial={{rotate: 20}} animate={{ rotate: 380 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke={ring1Color} strokeWidth="3" strokeDasharray="68.4 20" transition={{duration: 0.3}} />
            </motion.svg>
            
            <motion.svg className="absolute w-[65%] h-[65%]" viewBox="0 0 300 300" initial={{rotate: -50}} animate={{ rotate: -410 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke={ring2Color} strokeWidth="4" strokeDasharray="150 40 80 110" transition={{duration: 0.3}} />
            </motion.svg>
            
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" initial={{rotate: 90}} animate={{ rotate: 450 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke={ring3Color} strokeWidth="5" strokeDasharray="100 80 50 120 130" transition={{duration: 0.3}} />
            </motion.svg>
            
            <motion.div
                className="absolute w-[30%] h-[30%] rounded-full"
                style={{ background: orbGradient }}
                animate={{
                    scale: isListening || isSpeaking ? 1.1 : 1,
                    boxShadow: orbBoxShadow,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, duration: 0.3 }}
            />
        </div>

        <div className="text-center mt-8 min-h-[4rem] flex items-center justify-center">
             <AnimatePresence mode="wait">
                <motion.div
                    key={isLoading ? 'loader' : transcript || aiResponse}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-[90vw] md:w-auto"
                >
                    {isLoading ? (
                        <p className="text-lg text-cyan-400">Thinking{dots}</p>
                    ) : isListening ? (
                         <p className="text-lg text-cyan-400">Listening{dots}</p>
                    ) : transcript && !aiResponse ? (
                        <p className="text-xl">"{transcript}"</p>
                    ) : aiResponse ? (
                        <p className="text-lg text-center md:max-w-md">{aiResponse}</p>
                    ) : (
                        <p className="text-gray-400">Click the orb to start a voice search.</p>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AIConsciousnessPage;
