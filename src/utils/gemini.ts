import axios from 'axios';
import { AIResponse } from 'types/ai';

const GEMINI_API_KEY = 'xai-QXilKnnkatSHAx1k5M1OB4oqWef1K7PhTtsx1mQ6iBtyNlbiMinW8DsNbx7pPuyYXT200hfPklI5ERfK';
const API_URL = 'https://api.x.ai/v1/chat/completions';

export const generateResponse = async (prompt: string): Promise<AIResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}?key=${GEMINI_API_KEY}`,
      {
        model: 'grok-3-latest',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: 0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        }
      }
    );

    const text: string = response.data?.choices?.[0]?.message?.content || 'No response from Grok.';

    return {
      text,
      success: true
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: 'I apologize, something went wrong on the server side.',
      success: false
    };
  }
};
