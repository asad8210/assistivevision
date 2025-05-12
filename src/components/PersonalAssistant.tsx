import { useState, useCallback, useEffect } from 'react';
import { MessageSquare, Mic, MicOff, Loader } from 'lucide-react';
import { generateResponse } from '../utils/gemini';
import { speak } from '../utils/speech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface Message {
  text: string;
  isUser: boolean;
}

export const PersonalAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // To track if AI is processing
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
    setIsProcessing(true); // Start processing state

    // Get and speak AI response
    try {
      const response = await generateResponse(text);

      // Ensure that you're getting only the text and not the entire response object
      const responseText = typeof response === 'string' ? response : response.text;

      setMessages(prev => [...prev, { text: responseText, isUser: false }]);
      speak(responseText);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { text: "Sorry, I couldn't process that.", isUser: false }]);
    } finally {
      setIsProcessing(false); // Reset processing state
    }
  }, []);

  // Handle voice input
  useEffect(() => {
    if (transcript) {
      handleSend(transcript);
    }
  }, [transcript, handleSend]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-500" />
          Personal Assistant
        </h2>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-2 rounded-full ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg max-w-[80%] ${message.isUser ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200 text-gray-800'}`}
          >
            {message.text}
          </div>
        ))}
        {isProcessing && (
          <div className="p-3 text-center text-gray-600">
            <Loader className="animate-spin inline-block w-5 h-5 mr-2" />
            Processing your request...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isListening) handleSend(input); // Don't send if listening is active
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isListening || isProcessing} // Disable input while listening or processing
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          disabled={isListening || isProcessing} // Disable button while listening or processing
        >
          Send
        </button>
      </form>
    </div>
  );
};
