import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { Eye, EyeOff } from 'lucide-react';
import { initTensorFlow } from '../../utils/objectDetection/model'; // Ensure the correct path
import { drawDetections } from './canvas';
import { cancelSpeech } from '../../utils/speech';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';

const DETECTION_INTERVAL = 100; // Faster updates (10 FPS)

const WebcamFeed = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const animationFrameId = useRef<number>();
  const lastDetectionTime = useRef<number>(0);

  // Object detection function
  const detect = useCallback(
    async (timestamp: number) => {
      if (!model || !webcamRef.current?.video || !canvasRef.current) return;

      // Throttle detection rate
      if (timestamp - lastDetectionTime.current >= DETECTION_INTERVAL) {
        const video = webcamRef.current.video;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Get ImageData from canvas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Detect objects
            const rawPredictions = await model.detect(imageData);
            const predictions = rawPredictions.map((pred) => ({
              bbox: pred.bbox,
              class: pred.class,
              confidence: pred.score, // Map score to confidence
              score: pred.score,
            }));

            const ctxOverlay = canvasRef.current.getContext('2d');
            if (ctxOverlay) {
              drawDetections(ctxOverlay, predictions);
            }
          } catch (err) {
            console.error('Error during object detection:', err);
          }
          lastDetectionTime.current = timestamp;
        }
      }

      if (isDetecting) {
        animationFrameId.current = requestAnimationFrame(detect);
      }
    },
    [model, isDetecting]
  );
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedModel = await initTensorFlow(); // Ensure this function returns the correct model type
        if (loadedModel) {
          setModel(model); // Correctly set the loaded model
        } else {
          setError('Failed to load the model.'); // Handle case where the model is not loaded correctly
        }
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
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);
  

  useEffect(() => {
    if (isDetecting) {
      animationFrameId.current = requestAnimationFrame(detect);
    } else {
      // Clear canvas and stop detection if not detecting
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      cancelSpeech();
    }
  }, [isDetecting, detect]);

  const toggleDetection = () => {
    setIsDetecting((prev) => !prev);
  };

  if (error) return <ErrorState error={error} />;
  if (isLoading) return <LoadingState />;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
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
          onUserMediaError={() =>
            setError('Failed to access camera.')
          }
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
        <button
          onClick={toggleDetection}
          className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            isDetecting
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isDetecting ? (
            <>
              <EyeOff className="w-5 h-5" />
              <span>Stop Detection</span>
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              <span>Detect Real World</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WebcamFeed;
