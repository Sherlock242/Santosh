
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
  const [aiResponse, setAiResponse] = useState("Click the orb to start a voice search.");
  const [dots, setDots] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setAiResponse("Click the orb to start a voice search."); // Reset to default message
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

    const recognition = new window.webkitSpeechRecognition();
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
        <div 
          className="relative flex items-center justify-center w-48 h-48 md:w-60 md:h-60 cursor-pointer"
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
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="3" strokeDasharray="60 28.4" />
            </motion.svg>
            
            {/* Ring 2 (Middle - 4 cuts, different sizes) */}
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" style={{ width: '170px', height: '170px' }} initial={{rotate: -50}} animate={{ rotate: -410 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.6)" strokeWidth="4" strokeDasharray="150 40 80 110" />
            </motion.svg>
            
            {/* New Nano Particle Ring */}
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" style={{ width: '190px', height: '190px' }} initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.7)" strokeWidth="1" strokeDasharray="1 10" />
            </motion.svg>

            {/* Ring 3 (Outermost - 5 cuts, different sizes) */}
            <motion.svg className="absolute w-full h-full" viewBox="0 0 300 300" style={{ width: '240px', height: '240px' }} initial={{rotate: 90}} animate={{ rotate: 450 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
                <motion.circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 255, 255, 0.7)" strokeWidth="5" strokeDasharray="80 30 150 60 56" />
            </motion.svg>
            
            <motion.div
                className="absolute w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600 to-cyan-400 rounded-full"
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
                    ) : transcript ? (
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

    