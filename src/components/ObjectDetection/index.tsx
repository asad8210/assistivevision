import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Eye, EyeOff } from 'lucide-react';
import { initTensorFlow, detectObjects } from '../../utils/objectDetection/model';
import { LoadingState } from '../Layout/LoadingState';
import { ErrorState } from '../Layout/ErrorState';
import { speak } from '../../utils/speech';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export function ObjectDetection() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const { startListening } = useSpeechRecognition();

  useEffect(() => {
    const init = async () => {
      try {
        const success = await initTensorFlow();
        if (!success) throw new Error('Model initialization failed');
        setIsLoading(false);
        speak('Object detection model is ready. Say "start detection" to begin.');
        startListening();
      } catch (err) {
        setError('Failed to initialize object detection');
        setIsLoading(false);
      }
    };

    init();

    // Listen for voice command events
    const handleStartDetection = () => setIsDetecting(true);
    const handleStopDetection = () => setIsDetecting(false);

    window.addEventListener('startObjectDetection', handleStartDetection);
    window.addEventListener('stopObjectDetection', handleStopDetection);

    return () => {
      window.removeEventListener('startObjectDetection', handleStartDetection);
      window.removeEventListener('stopObjectDetection', handleStopDetection);
    };
  }, []);

  const processFrame = async () => {
    if (!webcamRef.current?.video || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Detect objects
    const detections = await detectObjects(imageData);

    // Draw detections
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    detections.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      
      // Draw box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';
      ctx.fillText(
        `${detection.class} ${Math.round(detection.confidence * 100)}%`,
        x,
        y > 20 ? y - 5 : y + 20
      );

      // Announce object position
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const position = getPositionDescription(centerX, centerY, canvas.width, canvas.height);
      speak(`${detection.class} detected ${position}`);
    });
  };

  const getPositionDescription = (x: number, y: number, width: number, height: number): string => {
    const horizontal = x < width / 3 ? 'on the left' : x > (2 * width) / 3 ? 'on the right' : 'in the center';
    const vertical = y < height / 3 ? 'at the top' : y > (2 * height) / 3 ? 'at the bottom' : 'in the middle';
    return `${horizontal} ${vertical}`;
  };

  useEffect(() => {
    let interval: number;
    if (isDetecting) {
      speak('Starting object detection');
      interval = setInterval(processFrame, 1000) as unknown as number;
    } else {
      speak('Stopping object detection');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDetecting]);

  if (error) {
    return <ErrorState message={error} retry={() => window.location.reload()} />;
  }

  if (isLoading) {
    return <LoadingState message="Loading YOLOv8 model..." />;
  }

  return (
    <div className="relative" role="region" aria-label="Object detection viewer">
      <Webcam
        ref={webcamRef}
        className="rounded-lg shadow-lg w-full"
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 640,
          height: 480,
          facingMode: "environment"
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 z-10"
        style={{ width: '100%', height: '100%' }}
      />
      <button
        onClick={() => setIsDetecting(!isDetecting)}
        className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2 ${
          isDetecting ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        } text-white transition-colors`}
        aria-label={isDetecting ? 'Stop Detection' : 'Start Detection'}
      >
        {isDetecting ? (
          <>
            <EyeOff className="w-5 h-5" />
            <span>Stop Detection</span>
          </>
        ) : (
          <>
            <Eye className="w-5 h-5" />
            <span>Start Detection</span>
          </>
        )}
      </button>
    </div>
  );
}