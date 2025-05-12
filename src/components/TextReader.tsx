import React, { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { FileText, Upload } from 'lucide-react';

const TextReader = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('');

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setText('');

    try {
      const worker = await createWorker('eng');
      const { data: { text: extractedText } } = await worker.recognize(file);
      setText(extractedText);
      
      // Read the text aloud
      const utterance = new SpeechSynthesisUtterance(extractedText);
      window.speechSynthesis.speak(utterance);
      
      await worker.terminate();
    } catch (error) {
      console.error('Error processing image:', error);
      setText('Error processing image. Please try again.');
    }

    setIsProcessing(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Text Reader</h2>
      
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        
        <label
          htmlFor="file-input"
          className="cursor-pointer"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            Drag and drop an image here, or click to select
          </p>
          <p className="text-sm text-gray-500">
            Supports JPG, PNG, and other image formats
          </p>
        </label>
      </div>

      {isProcessing && (
        <div className="mt-4 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-pulse" />
          <p className="text-gray-600">Processing image...</p>
        </div>
      )}

      {text && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Extracted Text:</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextReader;