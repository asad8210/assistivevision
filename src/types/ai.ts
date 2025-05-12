// Response from Gemini API call
export interface AIResponse {
  text: string;      // The generated text response
  success: boolean;  // Indicates if the API call was successful
}

// A message in the chat (user or AI)
export interface Message {
  text: string;       // Message content
  isUser: boolean;    // True if the message is from the user
  timestamp: number;  // UNIX timestamp (milliseconds)
}
