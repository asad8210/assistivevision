import { useRef, useEffect, useState } from 'react';
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

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedModel = await initTensorFlow();
        setModel(loadedModel);
      } catch (err) {
        setError('Failed to initialize object detection. Please refresh the page.');
        console.error('Failed to load model:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();

    // Cleanup function
    return () => {
      cancelSpeech();
    };
  }, []);

  const drawDetections = (
    ctx: CanvasRenderingContext2D,
    predictions: cocossd.DetectedObject[]
  ) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;

      // Draw bounding box
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = '#00FF00';
      ctx.font = '16px Arial';
      ctx.fillText(
        `${prediction.class} ${Math.round(prediction.score * 100)}%`,
        x,
        y > 10 ? y - 5 : 10
      );

      // Announce detection with speech
      speak(`Detected ${prediction.class} with ${Math.round(prediction.score * 100)}% confidence`);
    });
  };

  useEffect(() => {
    if (!isLoading && model && !error) {
      const detectInterval = setInterval(async () => {
        if (!webcamRef.current?.video || !canvasRef.current) return;

        const video = webcamRef.current.video;
        if (!video.readyState) return;

        // Set canvas dimensions
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        // Get canvas context
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Detect and draw on the canvas
        const predictions = await detectObjects(model, video);
        drawDetections(ctx, predictions);
      }, 1000); // Detect every 1 second (can be adjusted)

      return () => clearInterval(detectInterval);
    }
  }, [isLoading, model, error]);

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
      {isLoading ? (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading object detection model...</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Webcam
            ref={webcamRef}
            className="rounded-lg shadow-lg w-full"
            audio={false}
            screenshotFormat="image/jpeg"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 z-10"
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;
