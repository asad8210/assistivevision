import React, { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';
import { Mic, MicOff } from 'lucide-react';

const VoiceCommands = () => {
  const [isAutoListening, setIsAutoListening] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Weather API call
  const getWeather = async () => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=London&units=metric&appid=YOUR_API_KEY`
      );
      const temp = response.data.main.temp;
      const description = response.data.weather[0].description;
      return `The weather is ${description} with a temperature of ${Math.round(temp)} degrees Celsius.`;
    } catch (error) {
      return 'Sorry, I could not fetch the weather information.';
    }
  };

  // Time Function
  const getTime = () => {
    const now = new Date();
    return `The current time is ${now.toLocaleTimeString()}`;
  };

  // Handle commands based on speech
  const handleCommand = async () => {
    const command = transcript.toLowerCase();
    let response = '';

    if (command.includes('weather')) {
      response = await getWeather();
    } else if (command.includes('time')) {
      response = getTime();
    } else if (command.includes('hello') || command.includes('hi')) {
      response = 'Hello! How can I help you today?';
    } else {
      response = "Sorry, I didn't understand that command.";
    }

    if (response) {
      const utterance = new SpeechSynthesisUtterance(response);
      utterance.onend = () => {
        if (isAutoListening) {
          SpeechRecognition.startListening({ continuous: true });
        }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      SpeechRecognition.stopListening();
      resetTranscript();
    }
  };

  // Effect to handle when the transcript changes
  useEffect(() => {
    if (transcript.trim()) {
      handleCommand();
    }
  }, [transcript]);

  // Toggle listening state
  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setIsAutoListening(false);
    } else {
      SpeechRecognition.startListening({ continuous: true });
      setIsAutoListening(true);
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-center p-4 bg-red-100 text-red-700 rounded-lg">
        Your browser does not support speech recognition.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 🎤 Floating Mic Button Outside Canvas */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleListening}
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-full shadow-lg transition-colors ${
            listening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {listening ? (
            <>
              <Mic className="w-5 h-5 animate-pulse" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <MicOff className="w-5 h-5" />
              <span>Start</span>
            </>
          )}
        </button>
      </div>

      {/* 📦 Command Canvas */}
      <div className="p-6 mt-8 bg-white rounded-lg shadow-md max-w-xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">🎙️ Voice Assistant</h2>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Try saying:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>"What's the weather?"</li>
              <li>"What's the time?"</li>
              <li>"Hello" or "Hi"</li>
            </ul>
          </div>

          {transcript && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">🗣️ Last Heard:</h3>
              <p className="text-gray-800">{transcript}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCommands;
