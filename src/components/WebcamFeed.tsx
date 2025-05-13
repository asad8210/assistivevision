import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { Camera } from 'lucide-react';
import { initTensorFlow, detectObjects } from '../utils/objectDetection';
import { speak, cancelSpeech } from '../utils/speech';

const WebcamFeed = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Load COCO-SSD model once
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const model = await initTensorFlow();
        setModel(model);
      } catch (err) {
        setError('Failed to initialize object detection. Please refresh the page.');
        console.error('Model load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadModel();
    return () => cancelSpeech();
  }, []);

  // Voice Command Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log('Voice Command:', transcript);
      if (transcript.includes('start') || transcript.includes('open detection')) {
        if (!isDetecting) toggleDetection();
      } else if (transcript.includes('stop') || transcript.includes('close detection')) {
        if (isDetecting) toggleDetection();
      }
    };

    recognition.onerror = (e) => console.error('Speech recognition error:', e);
    recognition.start();

    return () => recognition.stop();
  }, [isDetecting]);

  // Draw Predictions
  const drawDetections = useCallback(
    (ctx: CanvasRenderingContext2D, predictions: cocossd.DetectedObject[]) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      predictions.forEach((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#00FF00';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${prediction.class} ${Math.round(prediction.score * 100)}%`,
          x,
          y > 10 ? y - 5 : 10
        );
        speak(`Detected ${prediction.class} with ${Math.round(prediction.score * 100)} percent confidence`);
      });
    },
    []
  );

  // Detection Loop
  useEffect(() => {
    if (!isDetecting || !model) return;

    const detectInterval = setInterval(async () => {
      if (!webcamRef.current?.video || !canvasRef.current) return;
      const video = webcamRef.current.video;
      if (video.readyState !== 4) return;

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const predictions = await detectObjects(model, video);
      drawDetections(ctx, predictions);
    }, 1000);

    return () => clearInterval(detectInterval);
  }, [isDetecting, model, drawDetections]);

  // Button/Voice toggle
  const toggleDetection = () => {
    setIsDetecting((prev) => !prev);
    if (isDetecting) cancelSpeech();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center p-6">
          <Camera className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
  <div className="relative w-full max-w-2xl mx-auto">
    {/* Main Content */}
    {isLoading ? (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading object detection model...</p>
        </div>
      </div>
    ) : error ? (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center p-6">
          <Camera className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    ) : (
      <div className="relative">
        <Webcam
          ref={webcamRef}
          className="rounded-lg shadow-lg w-full"
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }}
          onUserMediaError={() => setError('Failed to access camera.')}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    )}

    {/* 🎯 Floating Detection Toggle Button */}
    {!isLoading && !error && (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleDetection}
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-full shadow-lg transition-colors ${
            isDetecting
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isDetecting ? '🛑 Stop Detection' : '🎙️ Start Detection'}
        </button>
      </div>
    )}
  </div>
);

};

export default WebcamFeed;
