import React, { useState, useCallback } from 'react';
import { MessageSquare, Mic, MicOff } from 'lucide-react';
import { generateResponse } from '../../utils/gemini';
import { speak } from '../../utils/speech';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface Message {
  text: string;
  isUser: boolean;
}

export function PersonalAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { 
    isListening, 
    startListening, 
    stopListening, 
    transcript 
  } = useSpeechRecognition();

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text, isUser: true }]);
    setInput('');

    try {
      // Get AI response
      const response = await generateResponse(text);
      setMessages(prev => [...prev,{ text: response.text, isUser: false }]);

    } catch (error) {
      console.error('Error:', error);
      speak('Sorry, I encountered an error. Please try again.');
    }
  }, []);

  // Handle voice input
  React.useEffect(() => {
    if (transcript) {
      handleSend(transcript);
    }
  }, [transcript, handleSend]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-3 rounded-full ${
            isListening ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff /> : <Mic />}
        </button>
      </div>

      <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[80%] ${
              msg.isUser
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}