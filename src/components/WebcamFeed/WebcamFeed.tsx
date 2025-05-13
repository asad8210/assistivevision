import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { Eye, EyeOff } from 'lucide-react';
import { initTensorFlow } from '../../utils/objectDetection/model';
import { cancelSpeech } from '../../utils/speech';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';

const DETECTION_INTERVAL = 100; // 10 FPS

const WebcamFeed = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const animationFrameId = useRef<number>();
  const lastDetectionTime = useRef<number>(0);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  // === 🎙️ Voice Command Setup ===
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('🎙️ Voice Command:', transcript);

      if (transcript.includes('start detection')) {
        setIsDetecting(true);
      } else if (transcript.includes('stop detection')) {
        setIsDetecting(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);
    };

    recognition.onend = () => {
      recognition.start(); // Keep listening
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, []);

  // === 📷 Select Rear Camera ===
  useEffect(() => {
    const getRearCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        const rearDevice = videoDevices.find((d) =>
          d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
        );

        if (rearDevice) {
          setDeviceId(rearDevice.deviceId);
        } else if (videoDevices.length > 1) {
          setDeviceId(videoDevices[1].deviceId);
        } else {
          setDeviceId(videoDevices[0]?.deviceId);
        }
      } catch (err) {
        console.error('Camera selection error:', err);
        setError('Unable to access camera devices.');
      }
    };

    getRearCamera();
  }, []);

  // === 📦 Load Model ===
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const loadedModel = await initTensorFlow();
        setModel(model); // Fixed here: Set the loaded model correctly
      } catch (err) {
        console.error('Failed to load model:', err);
        setError('Failed to load the object detection model.');
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      cancelSpeech();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  // === 🧠 Detection Logic ===
  const detect = useCallback(
    async (timestamp: number) => {
      if (!model || !webcamRef.current?.video || !canvasRef.current) return;

      if (timestamp - lastDetectionTime.current >= DETECTION_INTERVAL) {
        const video = webcamRef.current.video;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context missing');

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const rawPredictions = await model.detect(imageData);

            const predictions = rawPredictions.map((pred) => ({
              bbox: pred.bbox,
              class: pred.class,
              confidence: pred.score,
              score: pred.score,
            }));

            // Drawing detections directly to the canvas
            const ctxOverlay = canvasRef.current.getContext('2d');
            if (ctxOverlay) {
              ctxOverlay.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              predictions.forEach((prediction) => {
                const [x, y, width, height] = prediction.bbox;
                ctxOverlay.strokeStyle = '#00FF00';
                ctxOverlay.lineWidth = 2;
                ctxOverlay.strokeRect(x, y, width, height);
                ctxOverlay.fillStyle = '#00FF00';
                ctxOverlay.font = '16px Arial';
                ctxOverlay.fillText(
                  `${prediction.class} ${Math.round(prediction.score * 100)}%`,
                  x,
                  y > 10 ? y - 5 : 10
                );
              });
            }
          } catch (err) {
            console.error('Detection error:', err);
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

  // === 🧲 Start/Stop Detection ===
  useEffect(() => {
    if (isDetecting) {
      animationFrameId.current = requestAnimationFrame(detect);
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
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
  if (isLoading || !deviceId) return <LoadingState />;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Webcam
          ref={webcamRef}
          className="rounded-lg shadow-lg w-full"
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }}
          onUserMediaError={() =>
            setError('Failed to access webcam. Please check your camera permissions.')
          }
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10"
          style={{ width: '100%', height: '100%' }}
        />

        {/* 🖱️ Click Detection */}
        <button
          onClick={toggleDetection}
          className="absolute bottom-4 left-4 px-4 py-2 rounded-lg flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          🖱️ Toggle Detection (Click / Speak)
        </button>

        {/* 🚦 Detection Status Button */}
        <button
          onClick={toggleDetection}
          className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            isDetecting ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
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
    </div>
  );
};

export default WebcamFeed;
