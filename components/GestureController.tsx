import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { SimulationParams } from '../types';

interface GestureControllerProps {
  onParamsUpdate: (params: Partial<SimulationParams>) => void;
  onCameraReady: (ready: boolean) => void;
}

const GestureController: React.FC<GestureControllerProps> = ({ onParamsUpdate, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        
        startWebcam();
      } catch (err) {
        console.error(err);
        setError("Failed to load AI models. Please refresh.");
      }
    };
    initMediaPipe();
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setLoading(false);
          onCameraReady(true);
          predictWebcam();
        };
      }
    } catch (err) {
      setError("Camera permission denied. Enable camera to control simulation.");
    }
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    const startTimeMs = performance.now();
    
    // Only detect if we have valid video data
    if (videoRef.current.videoWidth > 0) {
      const result = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      let chaos = 0;
      let scale = 0.5; // Default scale
      let handsDetected = false;

      if (result.landmarks && result.landmarks.length > 0) {
        handsDetected = true;
        
        result.landmarks.forEach((landmarks, index) => {
          const handedness = result.handednesses[index][0].categoryName; // "Left" or "Right"
          
          // Thumb tip (4) and Index tip (8)
          const thumb = landmarks[4];
          const indexFinger = landmarks[8];
          
          // Euclidean distance (simple 2D approximation is fine for interaction)
          const distance = Math.sqrt(
            Math.pow(thumb.x - indexFinger.x, 2) + 
            Math.pow(thumb.y - indexFinger.y, 2)
          );

          // Map distance to 0-1 range (approximate max pinch distance is ~0.2 in normalized coords)
          // Clamp value between 0 and 1
          const normalizedValue = Math.min(Math.max(distance * 5, 0), 1);

          // NOTE: Mediapipe mirror effect: 
          // If the user raises their RIGHT hand, it appears on the LEFT of the video (if mirrored).
          // But Mediapipe handedness outputs what the hand IS (e.g. "Right").
          
          if (handedness === "Left") {
            // Left Hand controls Chaos
            chaos = 1 - normalizedValue; // Closed pinch = high chaos? Or Open = high chaos?
            // Let's say: Pinch (close) = Calm (0), Open = Chaos (1)
            chaos = normalizedValue;
          } else {
            // Right Hand controls Scale
            scale = normalizedValue; 
          }
        });
      }

      onParamsUpdate({ chaos, scale, active: handsDetected });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative group">
      {/* Video Container */}
      <div className={`relative overflow-hidden rounded-xl border border-white/20 shadow-2xl transition-all duration-300 ${loading ? 'w-0 h-0' : 'w-48 md:w-64 aspect-video'}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1] opacity-60 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute bottom-2 left-2 text-[10px] text-white/50 font-mono pointer-events-none">
          FEED_LIVE_PROCESS_01
        </div>
        
        {/* Hand Landmark Overlay could go here, but focusing on Simulation visuals */}
      </div>

      {/* Loading / Error States */}
      {(loading || error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center space-y-4">
             {error ? (
               <div className="text-red-500 font-mono border border-red-500/50 p-6 rounded bg-red-900/10">
                 [ERROR]: {error}
               </div>
             ) : (
               <>
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-cyan-400 font-mono tracking-widest animate-pulse">INITIALIZING NEURAL LINK...</div>
               </>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GestureController;