import React, { useState } from 'react';
import { FileText, Upload, PlayCircle, StopCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { speak, cancelSpeech } from '../../utils/speech';


export function TextReader() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setText('');

    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          extractedText += pageText + '\n';
        }
      } else if (file.type.startsWith('image/')) {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(file);
        extractedText = text;
        await worker.terminate();
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        throw new Error('Unsupported file type');
      }

      setText(extractedText);
      speak('Text extracted successfully. Click read to hear the content.');
    } catch (error) {
      console.error('Error processing file:', error);
      speak('Error processing file. Please try again with a different file.');
    }

    setIsProcessing(false);
  };

  const handleRead = () => {
    if (isReading) {
      cancelSpeech();
      setIsReading(false);
    } else {
      speak(text);
      setIsReading(true);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
      >
        <input
          type="file"
          accept=".pdf,.txt,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
          className="hidden"
          id="file-input"
        />
        
        <label htmlFor="file-input" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            Drag and drop a file here, or click to select
          </p>
          <p className="text-sm text-gray-500">
            Supports PDF, TXT, and image files
          </p>
        </label>
      </div>

      {isProcessing && (
        <div className="text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-pulse" />
          <p className="text-gray-600">Processing file...</p>
        </div>
      )}

      {text && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Extracted Text:</h3>
            <button
              onClick={handleRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {isReading ? (
                <>
                  <StopCircle className="w-5 h-5" />
                  <span>Stop Reading</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  <span>Read Text</span>
                </>
              )}
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
            <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
}