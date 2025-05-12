import React from 'react';
import { Message } from '../../types/ai';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => (
  <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
    {messages.map((message, index) => (
      <div
        key={message.timestamp + index}
        className={`p-3 rounded-lg max-w-[80%] ${
          message.isUser
            ? 'bg-blue-500 text-white ml-auto'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        {message.text}
      </div>
    ))}
  </div>
);