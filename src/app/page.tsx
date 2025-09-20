
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { BrainCircuit, Mic, Sparkles, Volume2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { searchWikipedia } from './ai/flows/wikipedia-flow';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

const AIConsciousnessPage = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState("Click the orb to start a voice search.");
  const [dots, setDots] = useState('');

  const recognitionRef = useRef<any | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    setAiResponse(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
        setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
        setIsSpeaking(false);
    }
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    // Cleanup speechSynthesis on component unmount
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
    'what can you do': "I can search Wikipedia for any topic you're curious about. Just tell me what you want to know.",
    'how can you help me': "I can search Wikipedia for any topic you're curious about. Just tell me what you want to know.",
    'tell me a joke': "Why don't scientists trust atoms? Because they make up everything!",
    'how old are you': "I don't have an age in the human sense. I'm as old as my last update!",
    'what is the time': `I can't check the current time, but I can search for the history of timekeeping if you'd like.`,
    'are you a robot': "I'm a program, so in a way, yes. But I'm here to help you!",
    'i love you': "That's very kind of you! I appreciate it.",
  };
  
  const extractSearchQuery = (transcript: string): string => {
    const prefixes = [
        "who is", "what is", "what are", "tell me about", "search for",
        "i want to know about", "can you tell me about", "information on",
        "who invented", "what invented"
    ];

    const lowerCaseTranscript = transcript.toLowerCase();

    for (const prefix of prefixes) {
        if (lowerCaseTranscript.startsWith(prefix + " ")) {
            return transcript.substring(prefix.length + 1).trim();
        }
    }

    // If no prefix matches, return the original transcript, cleaned of punctuation.
    return transcript.replace(/[.,?_!]/g, '').trim();
  };


  const handleListen = () => {
    // If speaking, stop it. If listening, stop it.
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
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
        
        // Check for an etiquette match
        const etiquetteMatch = Object.keys(etiquetteResponses).find(key => normalizedTranscript.includes(key));
        
        if (etiquetteMatch) {
            const response = etiquetteResponses[etiquetteMatch];
            const randomResponse = Array.isArray(response) ? response[Math.floor(Math.random() * response.length)] : response;
            speak(randomResponse);
            setIsLoading(false);
            return;
        }
        
        // If no etiquette match, proceed with search
        const searchQuery = extractSearchQuery(finalTranscript);
        setIsLoading(true);
        try {
          const response = await searchWikipedia({ query: searchQuery });
          speak(response.summary);
        } catch (error) {
          console.error('Error fetching from Wikipedia:', error);
          const errorMessage = "I couldn't find information on that. Please try another topic.";
          speak(errorMessage);
        } finally {
          setIsLoading(false);
        }
      }
    };

    recognition.start();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4 overflow-hidden">
      <header className="absolute top-0 right-0 p-4 z-10">
        <Button asChild variant="ghost" className="text-white hover:bg-gray-800 hover:text-white">
          <Link href="/login">
            Sign In <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div 
          className="relative flex items-center justify-center w-60 h-60 cursor-pointer"
          onClick={handleListen}
        >
             {/* Nano Particles between ring 2 and 3 */}
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
                            x: (Math.random() - 0.5) * 220, // Positioned between mid and outer ring
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

            {/* Ring 1 (Innermost - 10 cuts) */}
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" style={{ width: '135px', height: '135px' }} initial={{rotate: 20}} animate={{ rotate: 380 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="3" strokeDasharray="68.4 20" />
            </motion.svg>
            
            {/* Ring 2 (Middle - 4 cuts, different sizes) */}
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" style={{ width: '170px', height: '170px' }} initial={{rotate: -50}} animate={{ rotate: -410 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.6)" strokeWidth="4" strokeDasharray="150 40 80 110" />
            </motion.svg>
            
            {/* Ring 3 (Outermost - 5 cuts, different sizes) */}
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" style={{ width: '260px', height: '260px' }} initial={{rotate: 90}} animate={{ rotate: 450 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.7)" strokeWidth="5" strokeDasharray="100 80 50 120 130" />
            </motion.svg>
            
            <motion.div
                className="absolute w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-400 rounded-full"
                animate={{
                    scale: isListening || isSpeaking ? 1.1 : 1,
                    boxShadow: isListening || isSpeaking
                    ? '0 0 30px #0ff, 0 0 15px #8A2BE2'
                    : '0 0 15px #0ff, 0 0 8px #8A2BE2',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
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
                >
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isListening ? (
                         <p className="text-lg text-cyan-400">Listening{dots}</p>
                    ) : transcript && !aiResponse ? (
                        <p className="text-xl">"{transcript}"</p>
                    ) : aiResponse ? (
                        <p className="text-lg text-center max-w-md">{aiResponse}</p>
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

    
