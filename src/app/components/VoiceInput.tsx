'use client';
import React, { useState, useEffect } from 'react';

interface VoiceInputProps {
  onFeedbackComplete: (feedback: string) => void;
  onTranscriptChange?: (text: string) => void;
  onSentimentChange?: (text: string) => void;
}

type SpeechRecognitionType = any;

const VoiceInput: React.FC<VoiceInputProps> = ({ onFeedbackComplete, onTranscriptChange, onSentimentChange }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window.webkitSpeechRecognition || window.SpeechRecognition) as {
        new (): SpeechRecognitionType;
      };
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        if (event.results[current].isFinal) {
          finalTranscript = transcriptText;
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          onTranscriptChange?.(finalTranscript);
          onSentimentChange?.(finalTranscript);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [onTranscriptChange, onSentimentChange]);

  const startListening = () => {
    setTranscript('');
    setIsListening(true);
    recognition?.start();
  };

  const stopListening = () => {
    setIsListening(false);
    recognition?.stop();
    if (transcript) {
      onFeedbackComplete(transcript);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value);
    onTranscriptChange?.(e.target.value);
    onSentimentChange?.(e.target.value);
  };

  return (
    <div className="voice-input-wrapper">
      <div 
        className={`recording-icon ${isListening ? 'recording' : ''}`}
        onClick={isListening ? stopListening : startListening}
        role="button"
        tabIndex={0}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        <svg 
          viewBox="0 0 24 24" 
          width="28" 
          height="28" 
          fill="currentColor"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </div>

      <style jsx>{`
        .voice-input-wrapper {
          display: inline-block;
        }

        .recording-icon {
          cursor: pointer;
          transition: all 0.3s ease;
          color: #0066FF;
        }

        .recording-icon.recording {
          color: #ff4444;
        }

        .recording-icon:hover {
          transform: scale(1.1);
        }

        .pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceInput; 