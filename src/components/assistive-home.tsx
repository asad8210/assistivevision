"use client";

import type { SpeechRecognitionResult } from "@/lib/speech";
import { speakText, startSpeechRecognition } from "@/lib/speech";
import { mockDescribeScene } from "@/lib/mock-describe-scene";
import { personalAssistant } from "@/ai/flows/personal-assistant";
import { useToast } from "@/hooks/use-toast";
import { Mic, Camera, Info, Volume2, Activity } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";

const AssistiveHomePage: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<string>(
    "Welcome! Double tap for camera, tap & hold for assistant."
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAssistantActive, setIsAssistantActive] = useState<boolean>(false);
  const [currentObjectDescription, setCurrentObjectDescription] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const isProcessingHoldRef = useRef<boolean>(false); // Prevents re-triggering hold

  const { toast } = useToast();

  const speakAndSetStatus = useCallback((text: string, isSilent?: boolean) => {
    setStatusMessage(text);
    if (!isSilent) {
      speakText(text);
    }
  }, []);

  // Auditory Welcome
  useEffect(() => {
    const welcomeMessage =
      "Welcome to Assistive Visions. Double tap the screen to identify objects. Tap and hold to speak to your personal assistant.";
    speakAndSetStatus(welcomeMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  const stopCamera = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    if (!isAssistantActive) { // Only reset status if assistant isn't also using it
        speakAndSetStatus("Camera off. Double tap for camera, tap & hold for assistant.");
    }
    setCurrentObjectDescription("");
  }, [isAssistantActive, speakAndSetStatus]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      speakAndSetStatus("Camera not supported on this device.");
      toast({ title: "Error", description: "Camera not supported.", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Video play error:", err));
      }
      setIsCameraActive(true);
      speakAndSetStatus("Camera active. Point to objects. Double tap to stop.");

      captureIntervalRef.current = setInterval(async () => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          if (videoWidth === 0 || videoHeight === 0) return;

          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
          const context = canvasRef.current.getContext("2d");
          if (context) {
            context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
            const imageDataUrl = canvasRef.current.toDataURL("image/jpeg");
            try {
              // speakAndSetStatus("Identifying object...", true); // Silent status update
              const result = await mockDescribeScene(imageDataUrl);
              setCurrentObjectDescription(result.description);
              speakText(result.description);
            } catch (error) {
              console.error("Error describing scene:", error);
              speakAndSetStatus("Could not identify object.");
              toast({ title: "Object Detection Error", description: String(error), variant: "destructive" });
            }
          }
        }
      }, 5000); // Capture frame every 5 seconds
    } catch (err) {
      console.error("Error accessing camera:", err);
      speakAndSetStatus("Could not access camera. Please check permissions.");
      toast({ title: "Camera Error", description: "Please grant camera permission.", variant: "destructive" });
      setIsCameraActive(false);
    }
  }, [speakAndSetStatus, toast]);

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
    setIsAssistantActive(false);
    if (!isCameraActive) { // Only reset status if camera isn't also using it
        speakAndSetStatus("Assistant off. Double tap for camera, tap & hold for assistant.");
    }
  }, [isCameraActive, speakAndSetStatus]);

  const startPersonalAssistant = useCallback(() => {
    if (isCameraActive) {
        speakAndSetStatus("Please stop the camera first before using the assistant.");
        return;
    }
    setIsAssistantActive(true);
    speakAndSetStatus("Listening...");

    speechRecognitionRef.current = startSpeechRecognition(
      async (result: SpeechRecognitionResult) => {
        if (result.isFinal) {
          speakAndSetStatus("Processing your request...", true);
          try {
            let locationString: string | undefined;
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
              );
              locationString = `Lat: ${position.coords.latitude.toFixed(2)}, Lon: ${position.coords.longitude.toFixed(2)}`;
            } catch (geoError) {
              console.warn("Could not get location:", geoError);
              toast({ title: "Location", description: "Could not get location. Proceeding without it.", variant: "default" });
            }

            const assistantResponse = await personalAssistant({ speech: result.transcript, location: locationString });
            speakAndSetStatus(assistantResponse.response);
            speakText(assistantResponse.response, () => {
              // If still active, listen again
              if (isAssistantActive && speechRecognitionRef.current) { // Check isAssistantActive again
                 speakAndSetStatus("Listening...");
                 speechRecognitionRef.current?.start();
              } else if (!isAssistantActive) {
                 stopPersonalAssistant(); // Ensure clean stop if deactivated during speech
              }
            });
          } catch (apiError) {
            console.error("Personal assistant API error:", apiError);
            speakAndSetStatus("Sorry, I couldn't process that. Please try again.");
            toast({ title: "Assistant Error", description: String(apiError), variant: "destructive" });
            // If still active, listen again after error
            if (isAssistantActive && speechRecognitionRef.current) {
               speakAndSetStatus("Listening...");
               speechRecognitionRef.current?.start();
            }
          }
        } else {
          setStatusMessage(`Heard: "${result.transcript}"...`);
        }
      },
      (error) => {
        console.error("Speech recognition error:", error);
        if (error !== "no-speech" && error !== "aborted" && error !== "audio-capture" && error !== "network") {
            speakAndSetStatus(`Speech recognition error: ${error}. Please try again.`);
        } else if (error === "no-speech" && isAssistantActive) {
           // speakAndSetStatus("Didn't catch that. Try speaking again.", true);
        }
        // If still active, attempt to restart, unless error is critical like "not-allowed"
        if (isAssistantActive && error !== "not-allowed" && error !== "service-not-allowed" && speechRecognitionRef.current) {
            speakAndSetStatus("Listening...");
            speechRecognitionRef.current?.start();
        } else if (isAssistantActive) {
            stopPersonalAssistant(); // Stop if critical error
        }
      },
      () => { // onEnd
        // This onEnd is called when recognition stops. If assistant is still active, we restart it in the onResult handler.
        // If it was stopped intentionally (isAssistantActive is false), stopPersonalAssistant would have been called.
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

  // Gesture Handling
  const handleDoubleClick = useCallback(() => {
    if (isProcessingHoldRef.current) return; // If a hold was just processed, ignore double tap
    toggleObjectDetection();
  }, [toggleObjectDetection]);

  const handlePointerDown = useCallback(() => {
    isProcessingHoldRef.current = false;
    // Clear any previous tap timers to prevent single tap firing after hold.
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    
    holdTimeoutRef.current = setTimeout(() => {
      if (holdTimeoutRef.current) { // Check if it wasn't cleared by pointer up
        isProcessingHoldRef.current = true; // Mark that a hold is being processed
        togglePersonalAssistant();
      }
      holdTimeoutRef.current = null;
    }, 700); // 700ms for hold
  }, [togglePersonalAssistant]);

  const handlePointerUp = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    // Logic for differentiating single tap vs. double tap (if not using onDoubleClick)
    // For simplicity, we rely on onDoubleClick for double taps.
    // If onDoubleClick is not reliable on all devices, more complex tap detection is needed here.
  }, []);


  useEffect(() => {
    // Cleanup function
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (speechRecognitionRef.current) speechRecognitionRef.current.abort();
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      // Stop any active camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      // Cancel any ongoing speech synthesis
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4 touch-manipulation select-none relative overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={(e) => { e.preventDefault(); handlePointerDown(); }} // Prevent default to avoid issues like zoom on double tap
      onTouchEnd={(e) => { e.preventDefault(); handlePointerUp(); }}
      aria-label="Assistive Visions Interactive Area"
      role="application"
    >
      {isCameraActive && (
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
          autoPlay
          playsInline
          muted // Mute video to prevent echo if mic is also active, though typically not simultaneously
          aria-label="Live camera feed for object detection"
        />
      )}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 pointer-events-none">
        <div 
          className="text-center bg-black/30 p-4 rounded-lg shadow-xl max-w-md backdrop-blur-sm"
          aria-live="assertive"
          aria-atomic="true"
        >
          <p className="text-2xl font-semibold mb-2">{statusMessage}</p>
          {isCameraActive && currentObjectDescription && (
            <p className="text-xl mt-2 italic">"{currentObjectDescription}"</p>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-4 pointer-events-none">
        {isCameraActive && <Camera size={32} className="text-accent animate-pulse" />}
        {isAssistantActive && <Mic size={32} className="text-accent animate-pulse" />}
        {!isCameraActive && !isAssistantActive && <Info size={32} className="opacity-70" />}
      </div>
      
      {/* Icon indicating auditory feedback is active */}
      <div className="absolute top-6 right-6 z-20 pointer-events-none">
         <Volume2 size={28} className="text-accent" />
      </div>
       {/* Activity Indicator */}
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
