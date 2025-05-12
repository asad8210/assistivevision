import axios from 'axios';
import { AIResponse } from 'types/ai';

const GEMINI_API_KEY = 'xai-QXilKnnkatSHAx1k5M1OB4oqWef1K7PhTtsx1mQ6iBtyNlbiMinW8DsNbx7pPuyYXT200hfPklI5ERfK';
const API_URL = 'https://api.x.ai/v1/chat/completions';

export const generateAIResponse = async (prompt: string): Promise<AIResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}?key=${GEMINI_API_KEY}`,
      {
        model: 'grok-3-latest',  // or appropriate model name
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        }
      }
    );

    const text = response.data?.choices?.[0]?.message?.content || 'No valid response received.';

    return {
      text,
      success: true
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: 'I apologize, but I encountered an error. Please try again.',
      success: false
    };
  }
};
