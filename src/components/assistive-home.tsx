
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
  // lastTapTimeRef removed as it was unused
  const isProcessingHoldRef = useRef<boolean>(false);

  const { toast } = useToast();

  const speakAndSetStatus = useCallback((text: string, isSilent?: boolean) => {
    setStatusMessage(text);
    if (!isSilent) {
      speakText(text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setStatusMessage and speakText are stable

  useEffect(() => {
    const welcomeMessage =
      "Welcome to Assistive Visions. Double tap the screen to identify objects. Tap and hold to speak to your personal assistant.";
    speakAndSetStatus(welcomeMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const captureAndDescribe = useCallback(async () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        const videoElement = videoRef.current;
        if (videoElement.paused) {
            try {
                await videoElement.play();
            } catch (e) {
                console.warn("Could not resume paused video for capture:", e);
                speakAndSetStatus("Camera paused, cannot identify objects.", true);
                return;
            }
        }

        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;

        if (videoWidth === 0 || videoHeight === 0) {
            console.warn("Video dimensions are zero during capture attempt. Video might not be fully loaded or playing.");
            return;
        }

        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        const context = canvasRef.current.getContext("2d");

        if (context) {
            context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
            const imageDataUrl = canvasRef.current.toDataURL("image/jpeg");
            try {
                const result = await mockDescribeScene(imageDataUrl);
                setCurrentObjectDescription(result.description);
                speakText(result.description);
            } catch (error) {
                console.error("Error describing scene:", error);
                speakAndSetStatus("Could not identify object.");
                toast({ title: "Object Detection Error", description: String(error), variant: "destructive" });
            }
        }
    } else {
        // console.warn("Capture preconditions not met: videoRef, canvasRef, or video not ready.");
    }
  }, [speakAndSetStatus, toast]);


  const stopCamera = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
       // Explicitly remove event listeners if they were added and not {once:true} or cleaned up elsewhere
      // However, current startCamera design aims to clean up its own listeners.
    }
    setIsCameraActive(false);
    if (!isAssistantActive) {
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

    if (isCameraActive) return; // Already active

    // Cleanup previous state
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    captureIntervalRef.current = null;
    if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }

    try {
      speakAndSetStatus("Initializing camera...", true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      
      if (videoRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = stream;
        
        let canPlaySetupDone = false;
        
        const canPlayTimeoutId = setTimeout(() => {
            videoElement.removeEventListener("canplay", handleCanPlayAsync);
            if (!canPlaySetupDone) {
                 console.warn("Camera 'canplay' event timed out.");
                 speakAndSetStatus("Camera timed out. Please try again.");
                 toast({ title: "Camera Error", description: "Timeout waiting for video data.", variant: "destructive" });
                 stream.getTracks().forEach((track) => track.stop());
                 if (videoRef.current) videoRef.current.srcObject = null;
                 setIsCameraActive(false);
            }
        }, 10000); // 10 second timeout

        const handleCanPlayAsync = async () => {
          clearTimeout(canPlayTimeoutId);
          if (canPlaySetupDone || !videoRef.current || videoRef.current.srcObject !== stream) { // Check if already run or stream changed
            if (videoRef.current && videoRef.current.srcObject !== stream && stream.active) { // Stale call, new stream might be starting
                stream.getTracks().forEach(track => track.stop()); // Stop this unused stream
            }
            return;
          }
          canPlaySetupDone = true;

          try {
            await videoElement.play();
            setIsCameraActive(true); 
            speakAndSetStatus("Camera active. Point to objects. Double tap to stop.");
            await captureAndDescribe(); 

            if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = setInterval(captureAndDescribe, 5000);

          } catch (playError) {
            console.error("Video play error:", playError);
            speakAndSetStatus("Could not start camera video.");
            toast({ title: "Camera Playback Error", description: String(playError), variant: "destructive" });
            setIsCameraActive(false); 
            stream.getTracks().forEach((track) => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
          }
        };
        
        videoElement.addEventListener("canplay", handleCanPlayAsync, { once: true });
        videoElement.load(); // Request browser to load video metadata

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
      speakAndSetStatus(userMessage);
      toast({ title: "Camera Access Error", description: err.message || userMessage, variant: "destructive" });
      setIsCameraActive(false);
    }
  }, [speakAndSetStatus, toast, captureAndDescribe, isCameraActive, setIsCameraActive]);


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
      speechRecognitionRef.current.stop(); // Use stop for graceful shutdown
      speechRecognitionRef.current = null;
    }
    setIsAssistantActive(false);
    if (!isCameraActive) {
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
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
              );
              locationString = `Lat: ${position.coords.latitude.toFixed(2)}, Lon: ${position.coords.longitude.toFixed(2)}`;
            } catch (geoError: any) {
              console.warn("Could not get location:", geoError);
              let geoErrorMessage = "Could not get location. Proceeding without it.";
              if (geoError.code === geoError.PERMISSION_DENIED) {
                geoErrorMessage = "Location permission denied. Proceeding without it.";
              } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
                geoErrorMessage = "Location information is unavailable. Proceeding without it.";
              } else if (geoError.code === geoError.TIMEOUT) {
                geoErrorMessage = "Location request timed out. Proceeding without it.";
              }
              toast({ title: "Location", description: geoErrorMessage, variant: "default" });
            }

            const assistantResponse = await personalAssistant({ speech: result.transcript, location: locationString });
            speakAndSetStatus(assistantResponse.response); // This speaks and sets status
            // No explicit speakText(assistantResponse.response, ...) needed here if speakAndSetStatus handles it

            // Check if still active before trying to listen again
             if (speechRecognitionRef.current && isAssistantActive) {
                 speakAndSetStatus("Listening...", true); // Silent, as main response was just spoken
                 speechRecognitionRef.current?.start();
             } else if (!isAssistantActive) {
                 stopPersonalAssistant();
             }

          } catch (apiError) {
            console.error("Personal assistant API error:", apiError);
            speakAndSetStatus("Sorry, I couldn't process that. Please try again.");
            toast({ title: "Assistant Error", description: String(apiError), variant: "destructive" });
            if (speechRecognitionRef.current && isAssistantActive) {
               speakAndSetStatus("Listening...", true);
               speechRecognitionRef.current?.start();
            }
          }
        } else {
          // Only update status message for interim results, don't speak them
          setStatusMessage(`Heard: "${result.transcript}"...`);
        }
      },
      (error) => { // onError for speech recognition
        console.error("Speech recognition error:", error);
        let errorMsg = `Speech recognition error: ${error}.`;
        if (error === "no-speech" && isAssistantActive) {
            errorMsg = "Didn't catch that. Tap and hold to try again.";
             // Don't automatically restart on no-speech, let user re-initiate.
            stopPersonalAssistant(); // Stop assistant on no-speech to avoid continuous "listening" prompts
            speakAndSetStatus(errorMsg); // Speak this specific feedback
            return;
        } else if (error === "audio-capture") {
            errorMsg = "No microphone found or microphone is not working.";
        } else if (error === "not-allowed" || error === "service-not-allowed") {
            errorMsg = "Microphone permission denied. Please enable it in browser settings.";
            stopPersonalAssistant(); // Stop assistant if permission denied
        } else if (error === "network") {
            errorMsg = "Network error during speech recognition. Please check your connection.";
        }
        
        if (isAssistantActive) { // If error wasn't handled by specific cases above stopping the assistant
            speakAndSetStatus(errorMsg + " Please try again.");
            // Attempt to restart unless critical error like "not-allowed" handled above
            if (error !== "not-allowed" && error !== "service-not-allowed" && error !== "no-speech" && speechRecognitionRef.current) {
                speakAndSetStatus("Listening...", true);
                speechRecognitionRef.current?.start();
            } else {
                 stopPersonalAssistant(); // Ensure it's stopped for other critical/unhandled errors
            }
        }
      },
      () => { // onEnd for speech recognition
        // If assistant is still meant to be active (e.g. after a successful recognition and response),
        // it's restarted in the onResult handler.
        // If it stopped due to an error that calls stopPersonalAssistant, or user action, this is fine.
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
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (speechRecognitionRef.current) speechRecognitionRef.current.abort(); // Use abort for immediate stop
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4 touch-manipulation select-none relative overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handlePointerDown} // Using onMouseDown for desktop simplicity
      onMouseUp={handlePointerUp}     // Using onMouseUp for desktop simplicity
      onTouchStart={(e) => { e.preventDefault(); handlePointerDown(); }} 
      onTouchEnd={(e) => { e.preventDefault(); handlePointerUp(); }}
      aria-label="Assistive Visions Interactive Area"
      role="application"
      tabIndex={0} // Make div focusable for accessibility, though primary interaction is touch/mouse
    >
      {/* Video element is always in the DOM but hidden if not active, srcObject controls visibility */}
      <video
        ref={videoRef}
        className={`absolute top-0 left-0 w-full h-full object-cover z-0 ${isCameraActive ? 'block' : 'hidden'}`}
        autoPlay
        playsInline
        muted 
        aria-hidden={!isCameraActive} // Hide from screen readers if not active
        aria-label="Live camera feed for object detection"
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 pointer-events-none">
        <div 
          className="text-center bg-black/50 p-4 rounded-lg shadow-xl max-w-md backdrop-blur-sm"
          aria-live="assertive" // Announces changes to screen readers
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

    