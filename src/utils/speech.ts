// Text-to-speech utility with repetition control
let lastSpokenText = '';

export const speak = (text: string) => {
  if (!text || text === lastSpokenText) return; // Prevent repeating the same text

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);

  // Update last spoken text
  lastSpokenText = text;
};

// Cancel any ongoing speech and reset last spoken text
export const cancelSpeech = () => {
  window.speechSynthesis.cancel();
  lastSpokenText = '';
};
