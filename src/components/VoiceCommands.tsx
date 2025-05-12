import React, { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';
import { Mic, MicOff } from 'lucide-react';

const VoiceCommands = () => {
  const [weather, setWeather] = useState<string>('');
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const getWeather = async () => {
    try {
      // Note: In a production environment, you should use environment variables
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=London&units=metric&appid=YOUR_API_KEY`
      );
      const temp = response.data.main.temp;
      const description = response.data.weather[0].description;
      return `The weather is ${description} with a temperature of ${Math.round(temp)}°C`;
    } catch (error) {
      return 'Sorry, I could not fetch the weather information';
    }
  };

  const getTime = () => {
    const now = new Date();
    return `The current time is ${now.toLocaleTimeString()}`;
  };

  const handleCommand = async () => {
    const command = transcript.toLowerCase();
    let response = '';

    if (command.includes('weather')) {
      response = await getWeather();
    } else if (command.includes('time')) {
      response = getTime();
    } else if (command.includes('hello') || command.includes('hi')) {
      response = 'Hello! How can I help you today?';
    }

    if (response) {
      const utterance = new SpeechSynthesisUtterance(response);
      window.speechSynthesis.speak(utterance);
      resetTranscript();
    }
  };

  useEffect(() => {
    handleCommand();
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-center p-4 bg-red-100 text-red-700 rounded-lg">
        Browser doesn't support speech recognition.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Voice Commands</h2>
        <button
          onClick={() => SpeechRecognition.startListening({ continuous: true })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {listening ? (
            <>
              <Mic className="w-5 h-5 animate-pulse" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <MicOff className="w-5 h-5" />
              <span>Start Listening</span>
            </>
          )}
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Available Commands:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>"What's the weather?"</li>
            <li>"What's the time?"</li>
            <li>"Hello" or "Hi"</li>
          </ul>
        </div>
        
        {transcript && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">Last Command:</h3>
            <p className="text-gray-600">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCommands;