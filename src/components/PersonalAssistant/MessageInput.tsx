import React from 'react';

interface MessageInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  input,
  onInputChange,
  onSubmit
}) => (
  <form onSubmit={onSubmit} className="flex gap-2">
    <input
      type="text"
      value={input}
      onChange={(e) => onInputChange(e.target.value)}
      placeholder="Type your message..."
      className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button
      type="submit"
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      Send
    </button>
  </form>
);