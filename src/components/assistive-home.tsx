
"use client";

import type { SpeechRecognitionResult } from "@/lib/speech";
import { speakText, startSpeechRecognition } from "@/lib/speech";
import { personalAssistant } from "@/ai/flows/personal-assistant";
import { describeDetailedScene, type DescribeDetailedSceneInput, type DescribeDetailedSceneOutput } from "@/ai/flows/describe-detailed-scene-flow";
import { useToast } from "@/hooks/use-toast";
import { Mic, Camera, Info, Volume2, Activity, Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";

// TensorFlow.js and COCO-SSD model
import * as tf from "@tensorflow/tfjs";
import type * as cocoSsd from "@tensorflow-models/coco-ssd";

// Ensure TFJS backend is set up
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';


const AssistiveHomePage: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<string>(
    "Welcome! Double tap for camera, tap & hold for assistant."
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAssistantActive, setIsAssistantActive] = useState<boolean>(false);
  const [currentObjectDescription, setCurrentObjectDescription] = useState<string>(""); // For on-screen text from COCO-SSD
  const [lastSpokenDetailedDescription, setLastSpokenDetailedDescription] = useState<string>("");
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true); // COCO-SSD model loading
  const [isGeneratingDetailedDescription, setIsGeneratingDetailedDescription] = useState<boolean>(false);
  const [objectDetections, setObjectDetections] = useState<cocoSsd.DetectedObject[]>([]);


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingHoldRef = useRef<boolean>(false);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const mountedRef = useRef(true); // To track component mount state


  const { toast } = useToast();

  const speakAndSetStatus = useCallback((text: string, isSilent?: boolean) => {
    setStatusMessage(text);
    if (!isSilent) {
      speakText(text);
    }
  }, []);

  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        const loadedModel = await (await import('@tensorflow-models/coco-ssd')).load();
        modelRef.current = loadedModel;
        if (mountedRef.current) {
            setIsModelLoading(false);
            speakAndSetStatus("Model loaded. Ready for object detection.", true);
            console.log("COCO-SSD model loaded successfully.");
        }
      } catch (error) {
        console.error("Error loading COCO-SSD model:", error);
        if (mountedRef.current) {
            speakAndSetStatus("Failed to load AI model. Object detection unavailable.");
            toast({ title: "Model Load Error", description: String(error), variant: "destructive" });
            setIsModelLoading(false);
        }
      }
    }
    loadModel();
  }, [speakAndSetStatus, toast]);


  useEffect(() => {
    const welcomeMessage =
      "Welcome to Assistive Visions. Double tap the screen to identify objects. Tap and hold to speak to your personal assistant.";
    if (!isModelLoading && mountedRef.current) {
        speakAndSetStatus(welcomeMessage);
    } else if (mountedRef.current) {
        setStatusMessage("Loading AI model for object detection...");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelLoading]);


  const drawBoundingBoxes = useCallback((predictions: cocoSsd.DetectedObject[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !canvas.getContext) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";

    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y, textWidth + 4, 18);
      ctx.fillStyle = "#000000";
      ctx.fillText(label, x + 2, y + 2);
    });
  }, []);


  const detectAndDescribeObjects = useCallback(async () => {
    if (!mountedRef.current || !modelRef.current || !videoRef.current || !canvasRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        return;
    }

    const videoElement = videoRef.current;
    if (videoElement.paused) {
        try { await videoElement.play(); } catch (e) { console.warn("Could not resume paused video for detection:", e); return; }
    }

    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.warn("Video dimensions are zero during detection attempt.");
        return;
    }

    if (canvasRef.current) {
        canvasRef.current.width = videoElement.videoWidth;
        canvasRef.current.height = videoElement.videoHeight;
    }

    try {
        const predictions = await modelRef.current.detect(videoElement);
        if (mountedRef.current) {
            setObjectDetections(predictions);
            drawBoundingBoxes(predictions);

            if (predictions.length > 0) {
                const distinctObjects = [...new Set(predictions.map(p => p.class))];
                const cocoDescription = "I see " + distinctObjects.slice(0, 3).join(", ") + ".";
                setCurrentObjectDescription(cocoDescription);
            } else {
                setCurrentObjectDescription("No objects detected by local model.");
            }
        }
    } catch (cocoError) {
        console.error("Error during COCO-SSD object detection:", cocoError);
        if (mountedRef.current) setCurrentObjectDescription("Error in local object detection.");
    }

    if (!isGeneratingDetailedDescription && videoRef.current && mountedRef.current) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoElement.videoWidth;
        tempCanvas.height = videoElement.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
            const frameDataUri = tempCanvas.toDataURL('image/jpeg', 0.8);

            if (frameDataUri) {
                setIsGeneratingDetailedDescription(true);
                try {
                    const flowInput: DescribeDetailedSceneInput = {
                        photoDataUri: frameDataUri,
                        previousDetailedDescription: lastSpokenDetailedDescription || undefined,
                    };
                    const output: DescribeDetailedSceneOutput = await describeDetailedScene(flowInput);

                    if (mountedRef.current) {
                        if (output.detailedDescription && output.detailedDescription.trim() !== "" && output.detailedDescription !== lastSpokenDetailedDescription) {
                            setLastSpokenDetailedDescription(output.detailedDescription);
                            speakText(output.detailedDescription);
                        }
                    }
                } catch (flowError: any) {
                    console.error("Error calling describeDetailedSceneFlow:", flowError);
                    const errorMsg = flowError.message?.includes("API key not valid")
                        ? "AI service API key is not valid. Please check your configuration."
                        : "Sorry, I couldn't get a detailed description of the scene at the moment.";
                    if (mountedRef.current) {
                        speakText(errorMsg);
                        toast({ title: "Detailed Description Error", description: flowError.message || "Unknown error from AI flow.", variant: "destructive"});
                    }
                } finally {
                    if (mountedRef.current) setIsGeneratingDetailedDescription(false);
                }
            }
        }
    }
  }, [drawBoundingBoxes, isGeneratingDetailedDescription, lastSpokenDetailedDescription, toast]);


  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
        setIsCameraActive(false);
        const canvas = canvasRef.current;
        if (canvas && canvas.getContext('2d')) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setObjectDetections([]);
        if (!isAssistantActive) {
            speakAndSetStatus("Camera off. Double tap for camera, tap & hold for assistant.");
        }
        setCurrentObjectDescription("");
        setLastSpokenDetailedDescription("");
        setIsGeneratingDetailedDescription(false);
    }
  }, [isAssistantActive, speakAndSetStatus]);

  const startCamera = useCallback(async () => {
    if (isModelLoading) {
        speakAndSetStatus("AI Model is still loading. Please wait.");
        toast({title: "Model Loading", description: "Please wait for the AI model to finish loading before starting the camera."});
        return;
    }
    if (!modelRef.current) {
        speakAndSetStatus("AI Model not loaded. Object detection unavailable.");
        toast({title: "Error", description: "AI Model for object detection is not available.", variant: "destructive"});
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      speakAndSetStatus("Camera not supported on this device.");
      toast({ title: "Error", description: "Camera not supported.", variant: "destructive" });
      return;
    }

    if (isCameraActive) return;

    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = null;
    if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }

    try {
      if (mountedRef.current) speakAndSetStatus("Initializing camera...", true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

      if (videoRef.current && mountedRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = stream;

        let canPlaySetupDone = false;

        const canPlayTimeoutId = setTimeout(() => {
            videoElement.removeEventListener("canplay", handleCanPlayAsync);
            if (!canPlaySetupDone && mountedRef.current) {
                 console.warn("Camera 'canplay' event timed out.");
                 speakAndSetStatus("Camera timed out. Please try again.");
                 toast({ title: "Camera Error", description: "Timeout waiting for video data.", variant: "destructive" });
                 stream.getTracks().forEach((track) => track.stop());
                 if (videoRef.current) videoRef.current.srcObject = null;
                 setIsCameraActive(false);
            }
        }, 10000);

        const handleCanPlayAsync = async () => {
          clearTimeout(canPlayTimeoutId);
          if (canPlaySetupDone || !mountedRef.current || !videoRef.current || videoRef.current.srcObject !== stream) {
            if (videoRef.current && videoRef.current.srcObject !== stream && stream.active) {
                stream.getTracks().forEach(track => track.stop());
            }
            return;
          }
          canPlaySetupDone = true;

          try {
            await videoElement.play();
             if (!mountedRef.current) {  stream.getTracks().forEach(track => track.stop()); return; }
            setIsCameraActive(true);
            speakAndSetStatus("Camera active. Point to objects. Double tap to stop.");

            if (canvasRef.current && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                canvasRef.current.width = videoElement.videoWidth;
                canvasRef.current.height = videoElement.videoHeight;
            }

            await detectAndDescribeObjects();

            if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = setInterval(detectAndDescribeObjects, 3000);

          } catch (playError) {
            console.error("Video play error:", playError);
            if (mountedRef.current) {
                speakAndSetStatus("Could not start camera video.");
                toast({ title: "Camera Playback Error", description: String(playError), variant: "destructive" });
                setIsCameraActive(false);
            }
            stream.getTracks().forEach((track) => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
          }
        };

        videoElement.addEventListener("canplay", handleCanPlayAsync, { once: true });
        videoElement.load();

      } else {
         stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err: any) {
      console.error("Error accessing camera (getUserMedia):", err);
      let userMessage = "Could not access camera. Please check permissions.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        userMessage = "Camera permission denied. Please enable it in browser settings.";
      } else if (err.name === "NotFoundError") {
        userMessage = "No camera found. Ensure a camera is connected and enabled.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        userMessage = "Camera is already in use or a hardware error occurred.";
      } else if (err.name === "OverconstrainedError"){
        userMessage = "No camera found that meets the requirements (e.g. facing mode).";
      } else if (err.name === "TypeError"){
         userMessage = "Camera features not correctly specified or an issue with device enumeration.";
      }
      if (mountedRef.current) {
        speakAndSetStatus(userMessage);
        toast({ title: "Camera Access Error", description: err.message || userMessage, variant: "destructive" });
        setIsCameraActive(false);
      }
    }
  }, [speakAndSetStatus, toast, detectAndDescribeObjects, isCameraActive, setIsCameraActive, isModelLoading]);


  const toggleObjectDetection = useCallback(() => {
    if (isAssistantActive) {
        speakAndSetStatus("Please stop the assistant first before using the camera.");
        return;
    }
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isCameraActive, isAssistantActive, startCamera, stopCamera, speakAndSetStatus]);


  const stopPersonalAssistant = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    if (mountedRef.current) {
        setIsAssistantActive(false);
        if (!isCameraActive) {
            speakAndSetStatus("Assistant off. Double tap for camera, tap & hold for assistant.");
        }
    }
  }, [isCameraActive, speakAndSetStatus]);

  const startPersonalAssistant = useCallback(() => {
    if (isCameraActive) {
        speakAndSetStatus("Please stop the camera first before using the assistant.");
        return;
    }
    if (mountedRef.current) setIsAssistantActive(true);
    speakAndSetStatus("Listening..."); // Initial "Listening..." spoken once.

    speechRecognitionRef.current = startSpeechRecognition(
      async (result: SpeechRecognitionResult) => {
        if (result.isFinal) {
          if (!mountedRef.current) return;
          setStatusMessage("Processing your request..."); // Silent status update
          try {
            let locationString: string | undefined;
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
              );
              locationString = `Lat: ${position.coords.latitude.toFixed(2)}, Lon: ${position.coords.longitude.toFixed(2)}`;
            } catch (geoError: any) {
              console.warn("Could not get location:", geoError);
              // ... (toast for location error)
            }

            const assistantResponse = await personalAssistant({ speech: result.transcript, location: locationString });
            if (!mountedRef.current) return;

            setStatusMessage(assistantResponse.response); // Update UI text
            speakText(assistantResponse.response, () => { // Speak response, then...
              if (mountedRef.current) {
                if (speechRecognitionRef.current && isAssistantActive) {
                   setStatusMessage("Listening..."); // Update UI for listening state
                   speechRecognitionRef.current?.start();
                } else if (!isAssistantActive) {
                   stopPersonalAssistant();
                }
              }
            });

          } catch (apiError: any) {
            console.error("Personal assistant API error:", apiError);
            const errorMsg = apiError.message?.includes("API key not valid")
                ? "AI Assistant service API key is not valid. Please check configuration."
                : "Sorry, I couldn't process that. Please try again.";
            if (!mountedRef.current) return;

            setStatusMessage(errorMsg); // Update UI text
            toast({ title: "Assistant Error", description: apiError.message || String(apiError), variant: "destructive" });
            speakText(errorMsg, () => { // Speak error, then...
                if (mountedRef.current) {
                    if (speechRecognitionRef.current && isAssistantActive) {
                       setStatusMessage("Listening..."); // Update UI for listening state
                       speechRecognitionRef.current?.start();
                    }
                }
            });
          }
        } else {
          if (mountedRef.current) setStatusMessage(`Heard: "${result.transcript}"...`);
        }
      },
      (error) => {
        if (!mountedRef.current) return;
        console.error("Speech recognition error:", error);
        let errorMsgText = `Speech recognition error: ${error}.`;
        let shouldStopAndSpeak = false;
        let messageForUser = "";

        if (error === "no-speech" && isAssistantActive) {
            messageForUser = "Didn't catch that. Tap and hold to try again.";
            shouldStopAndSpeak = true;
        } else if (error === "audio-capture") {
            messageForUser = "No microphone found or microphone is not working. Please check your microphone and try again.";
            shouldStopAndSpeak = true; // Often better to stop and inform
        } else if (error === "not-allowed" || error === "service-not-allowed") {
            messageForUser = "Microphone permission denied. Please enable it in browser settings.";
            shouldStopAndSpeak = true;
        } else if (error === "network") {
            messageForUser = "Network error during speech recognition. Please check your connection and try again.";
            // For network, could retry or stop. Let's retry after speaking.
        }

        if (shouldStopAndSpeak) {
            stopPersonalAssistant();
            speakAndSetStatus(messageForUser || errorMsgText, false); // Speak the specific user message or generic error
            return;
        }

        // For other errors or if assistant is still active and not stopping
        if (isAssistantActive) {
            const fullErrorToSpeak = (messageForUser || errorMsgText) + " Let me try listening again.";
            setStatusMessage(fullErrorToSpeak); // Update UI text
            speakText(fullErrorToSpeak, () => { // Speak error explanation and retry intention
                if (mountedRef.current) {
                    if (speechRecognitionRef.current && isAssistantActive) {
                        setStatusMessage("Listening..."); // Update UI for listening state
                        speechRecognitionRef.current?.start();
                    } else if (mountedRef.current) { // If something changed (e.g. assistant stopped)
                        stopPersonalAssistant(); // Ensure it's stopped if it can't restart
                        speakAndSetStatus("Assistant stopped due to an unexpected issue.", false);
                    }
                }
            });
        }
      },
      () => {
        // onEnd callback for startSpeechRecognition itself - usually not needed for continuous loop
      }
    );
  }, [isCameraActive, speakAndSetStatus, toast, isAssistantActive, stopPersonalAssistant]);


  const togglePersonalAssistant = useCallback(() => {
    if (isAssistantActive) {
      stopPersonalAssistant();
    } else {
      startPersonalAssistant();
    }
  }, [isAssistantActive, startPersonalAssistant, stopPersonalAssistant]);

  const handleDoubleClick = useCallback(() => {
    if (isProcessingHoldRef.current) return;
    toggleObjectDetection();
  }, [toggleObjectDetection]);

  const handlePointerDown = useCallback(() => {
    isProcessingHoldRef.current = false;
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

    holdTimeoutRef.current = setTimeout(() => {
      if (holdTimeoutRef.current) {
        isProcessingHoldRef.current = true;
        togglePersonalAssistant();
      }
      holdTimeoutRef.current = null;
    }, 700);
  }, [togglePersonalAssistant]);

  const handlePointerUp = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);


  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (speechRecognitionRef.current) speechRecognitionRef.current.abort();
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (modelRef.current && typeof (modelRef.current as any).dispose === 'function') {
        (modelRef.current as any).dispose();
        console.log("COCO-SSD model disposed.");
      }
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4 touch-manipulation select-none relative overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={(e) => { e.preventDefault(); handlePointerDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); handlePointerUp(); }}
      aria-label="Assistive Visions Interactive Area"
      role="application"
      tabIndex={0}
    >
      <video
        ref={videoRef}
        className={`absolute top-0 left-0 w-full h-full object-cover z-0 ${isCameraActive ? 'block' : 'hidden'}`}
        autoPlay
        playsInline
        muted
        aria-hidden={!isCameraActive}
        aria-label="Live camera feed for object detection"
      />
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full object-cover z-[5] ${isCameraActive ? 'block' : 'hidden'}`}
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 pointer-events-none">
        <div
          className="text-center bg-black/60 p-4 rounded-lg shadow-xl max-w-md backdrop-blur-md"
          aria-live="assertive"
          aria-atomic="true"
        >
            {isModelLoading ? (
                <div className="flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin mr-2 text-primary" />
                    <p className="text-xl font-semibold">Loading AI model...</p>
                </div>
            ) : (
                 isGeneratingDetailedDescription && isCameraActive ? (
                    <div className="flex items-center justify-center">
                        <Loader2 size={28} className="animate-spin mr-2 text-accent" />
                        <p className="text-xl font-semibold">Analyzing scene details...</p>
                    </div>
                ) : (
                    <p className="text-2xl font-semibold mb-2">{statusMessage}</p>
                )
            )}
          {isCameraActive && currentObjectDescription && !isModelLoading && !isGeneratingDetailedDescription && (
            <p className="text-xl mt-2 italic">"{currentObjectDescription}"</p>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-4 pointer-events-none">
        {isCameraActive && !isGeneratingDetailedDescription && <Camera size={32} className="text-accent animate-pulse" />}
        {isCameraActive && isGeneratingDetailedDescription && <Loader2 size={32} className="text-accent animate-spin" />}
        {isAssistantActive && <Mic size={32} className="text-accent animate-pulse" />}
        {!isCameraActive && !isAssistantActive && !isModelLoading && <Info size={32} className="opacity-70" />}
         {isModelLoading && <Loader2 size={32} className="animate-spin text-primary" />}
      </div>

      <div className="absolute top-6 right-6 z-20 pointer-events-none">
         <Volume2 size={28} className="text-accent" />
      </div>
       {(isCameraActive || isAssistantActive) && (
         <div className="absolute top-6 left-6 z-20 pointer-events-none">
           <Activity size={28} className="text-primary animate-ping opacity-75" />
           <Activity size={28} className="text-primary absolute top-0 left-0" />
         </div>
       )}

    </div>
  );
};

export default AssistiveHomePage;

    