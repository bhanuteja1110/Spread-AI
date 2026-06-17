'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Define the SpeechRecognition types ourselves — they're not in all TS DOM lib versions
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventData extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventData extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventData) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventData) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechOptions {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  lang?: string;
}

interface UseSpeechReturn {
  isListening: boolean;
  isSupported: boolean;
  toggleListening: () => void;
}

export function useSpeech({
  onResult,
  onError,
  lang = 'en-US',
}: UseSpeechOptions = {}): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const SpeechRecognitionImpl: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEventData) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      onResultRef.current?.(
        finalTranscript || interimTranscript,
        Boolean(finalTranscript),
      );
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventData) => {
      if (event.error === 'no-speech') return;

      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please enable it in browser settings.',
        'audio-capture': 'No microphone detected on this device.',
        'network': 'Network error during speech recognition.',
        'aborted': 'Speech recognition was aborted.',
      };

      onErrorRef.current?.(errorMessages[event.error] ?? `Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        onErrorRef.current?.('Could not start microphone. It may already be in use.');
      }
    }
  }, [isListening]);

  return { isListening, isSupported, toggleListening };
}
