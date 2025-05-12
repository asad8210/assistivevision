import { useState, useCallback, useEffect } from 'react';
import { processVoiceCommand } from '../utils/accessibility/voiceCommands';
import { speak } from '../utils/speech';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;

      recognitionInstance.onresult = (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        setTranscript(text);
        
        // Process voice commands
        if (event.results[last].isFinal) {
          const commandProcessed = processVoiceCommand(text);
          if (!commandProcessed) {
            speak('Command not recognized. Please try again.');
          }
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        // Automatically restart listening
        if (recognitionInstance) {
          recognitionInstance.start();
        }
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
      setTranscript('');
      speak('Voice commands activated. You can now speak commands.');
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
      speak('Voice commands deactivated.');
    }
  }, [recognition]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
  };
};