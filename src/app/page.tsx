
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Mic, Sparkles, Volume2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { searchWikipedia } from './ai/flows/wikipedia-flow';

const AIConsciousnessPage = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState("Hello, I am Edengram's public consciousness. Ask me anything.");
  const [dots, setDots] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setAiResponse(''); // Clear response after speaking
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    // Temporarily disabling the auto-speak on load as it can be repetitive.
    // speak(aiResponse);
  }, []);


  const handleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support the Web Speech API. Please try Chrome.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event);
      setIsListening(false);
    };

    recognition.onresult = async (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setIsListening(false);
        setIsLoading(true);
        recognition.stop();

        try {
          const response = await searchWikipedia({ query: finalTranscript });
          setAiResponse(response.summary);
          speak(response.summary);
        } catch (error) {
          console.error('Error fetching from Wikipedia:', error);
          const errorMessage = "I couldn't find information on that. Please try another topic.";
          setAiResponse(errorMessage);
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
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
            {[...Array(2)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute border-2 border-cyan-400/50 rounded-full"
                style={{
                width: `${(i + 1) * 80 + 100}px`,
                height: `${(i + 1) * 80 + 100}px`,
                rotate: Math.random() * 360,
                }}
                animate={{
                rotate: 360 + Math.random() * 360,
                scale: [1, 1.05, 1],
                }}
                transition={{
                duration: 15 + i * 10,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear',
                }}
            >
                <motion.div className="absolute w-full h-full rounded-full" style={{
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                    borderColor: 'transparent',
                    borderTopColor: `rgba(0, 255, 255, ${0.2 + i * 0.1})`,
                    rotate: Math.random() * 360,
                }} />
            </motion.div>
            ))}
            
            <motion.div
            className="absolute w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-600 to-cyan-400 rounded-full"
            animate={{
                scale: isListening || isSpeaking ? 1.1 : 1,
                boxShadow: isListening || isSpeaking
                ? '0 0 40px #0ff, 0 0 20px #8A2BE2'
                : '0 0 20px #0ff, 0 0 10px #8A2BE2',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            />
            
            <AnimatePresence>
                {(isListening || isSpeaking) && (
                <motion.div
                    className="absolute w-full h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute bg-cyan-400 rounded-full"
                            style={{
                                width: '4px',
                                height: '4px',
                                top: '50%',
                                left: '50%',
                                x: '-50%',
                                y: '-50%',
                            }}
                            animate={{
                                x: `${Math.cos((i / 20) * 2 * Math.PI) * 160}px`,
                                y: `${Math.sin((i / 20) * 2 * Math.PI) * 160}px`,
                                scale: [0, 1.5, 0],
                                opacity: [0, 0.7, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.1,
                            }}
                        />
                    ))}
                </motion.div>
                )}
            </AnimatePresence>

        </div>

        <div className="text-center mt-8">
            {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
            ) : transcript ? (
            <>
                <p className="text-gray-400">You said:</p>
                <p className="text-xl">"{transcript}"</p>
            </>
            ) : aiResponse ? (
            <p className="text-lg text-center max-w-md">{aiResponse}</p>
            ) : (
                <p className="text-gray-500">Press the button and speak...</p>
            )}
        </div>
      </div>
       <div className="flex-shrink-0 flex justify-center pb-8 pt-4">
            <motion.button
            onClick={handleListen}
            className="p-4 rounded-full bg-cyan-400/20 text-cyan-400 border border-cyan-400/50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            >
            {isListening ? (
                <motion.div
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                >
                    <Mic className="h-8 w-8" />
                </motion.div>
            ) : isSpeaking ? (
                <Volume2 className="h-8 w-8" />
            ) : (
                <Mic className="h-8 w-8" />
            )}
            </motion.button>
      </div>

    </div>
  );
};

export default AIConsciousnessPage;
