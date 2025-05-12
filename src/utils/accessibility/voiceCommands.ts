import { speak } from '../speech';

type CommandHandler = () => void;

interface VoiceCommand {
  keywords: string[];
  handler: CommandHandler;
  description: string;
}

const commands: VoiceCommand[] = [
  {
    keywords: ['start detection', 'detect objects', 'start camera'],
    handler: () => window.dispatchEvent(new CustomEvent('startObjectDetection')),
    description: 'Starts object detection'
  },
  {
    keywords: ['stop detection', 'stop camera'],
    handler: () => window.dispatchEvent(new CustomEvent('stopObjectDetection')),
    description: 'Stops object detection'
  },
  {
    keywords: ['read text', 'start reading'],
    handler: () => window.dispatchEvent(new CustomEvent('startTextReader')),
    description: 'Opens text reader'
  },
  {
    keywords: ['navigate', 'start navigation'],
    handler: () => window.dispatchEvent(new CustomEvent('startNavigation')),
    description: 'Opens navigation'
  }
];

export const processVoiceCommand = (transcript: string): boolean => {
  const lowercaseTranscript = transcript.toLowerCase();
  
  for (const command of commands) {
    if (command.keywords.some(keyword => lowercaseTranscript.includes(keyword))) {
      command.handler();
      speak(`Executing command: ${command.description}`);
      return true;
    }
  }
  
  return false;
};