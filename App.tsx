import React, { useRef, useState, useCallback, useEffect } from 'react';
import GalaxyCanvas from './components/GalaxyCanvas';
import GestureController from './components/GestureController';
import { SimulationParams, ChatMessage } from './types';
import { generateCosmicAnalysis } from './services/geminiService';
import { Sparkles, Activity, Maximize2, Zap, Mic, MicOff } from 'lucide-react';

const INITIAL_PARAMS: SimulationParams = {
  chaos: 0.1,
  scale: 0.5,
  active: false
};

export default function App() {
  // Use Ref for high-frequency updates to avoid React render cycle overhead on the canvas
  const paramsRef = useRef<SimulationParams>(INITIAL_PARAMS);
  // Use State for low-frequency UI updates (labels, chat)
  const [uiParams, setUiParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Update loop handler
  const handleParamsUpdate = useCallback((newParams: Partial<SimulationParams>) => {
    // Update the ref for the canvas
    paramsRef.current = { ...paramsRef.current, ...newParams };
    
    // Update the UI state less frequently (e.g., every 10th frame or just let React batch it)
    // For smoothness in this demo, we'll update active state immediately, but throttle values if needed.
    // Here we just set it, React 18 automatic batching helps.
    setUiParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const handleAnalyze = async (customPrompt?: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    
    const displayText = customPrompt || 'Analyze current simulation status.';

    // Add user request
    const userMsg: ChatMessage = {
      role: 'user',
      text: displayText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    // Call Gemini
    const analysis = await generateCosmicAnalysis(
      paramsRef.current.chaos, 
      paramsRef.current.scale,
      customPrompt
    );

    const aiMsg: ChatMessage = {
      role: 'model',
      text: analysis,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsAnalyzing(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleAnalyze(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden selection:bg-cyan-500/30">
      
      {/* Background Simulation */}
      <GalaxyCanvas params={paramsRef} />

      {/* Main UI Overlay */}
      <div className={`relative z-10 w-full h-full pointer-events-none transition-opacity duration-1000 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Header */}
        <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              NEBULA<span className="text-white text-base ml-2 font-light opacity-50">CONTROL INTERFACE</span>
            </h1>
            <p className="text-xs text-white/40 mt-1 max-w-md font-mono">
              INSTRUCTIONS: Pinch LEFT hand for Chaos. Pinch RIGHT hand for Scale.
            </p>
          </div>
          
          <GestureController 
            onParamsUpdate={handleParamsUpdate} 
            onCameraReady={setCameraReady}
          />
        </header>

        {/* HUD Stats (Left Bottom) */}
        <div className="absolute bottom-10 left-10 space-y-6 pointer-events-auto w-64">
          {/* Scale Meter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-mono text-cyan-300">
              <span className="flex items-center gap-2"><Maximize2 size={16} /> GRAVITY WELL</span>
              <span>{(uiParams.scale * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-100 ease-linear"
                style={{ width: `${uiParams.scale * 100}%` }}
              />
            </div>
          </div>

          {/* Chaos Meter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-mono text-violet-300">
              <span className="flex items-center gap-2"><Zap size={16} /> ENTROPY</span>
              <span>{(uiParams.chaos * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-100 ease-linear"
                style={{ width: `${uiParams.chaos * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-white/30">
             <Activity size={12} className={uiParams.active ? "text-green-500 animate-pulse" : "text-red-500"} />
             STATUS: {uiParams.active ? "HANDS DETECTED - LINK ESTABLISHED" : "SEARCHING FOR BIO-INPUT..."}
          </div>
        </div>

        {/* AI Analysis Panel (Right Bottom) */}
        <div className="absolute bottom-10 right-10 w-80 pointer-events-auto flex flex-col items-end space-y-4">
           {/* Chat Messages */}
           <div className="w-full max-h-60 overflow-y-auto space-y-3 flex flex-col-reverse pr-2">
              {messages.slice().reverse().map((msg, idx) => (
                <div key={idx} className={`p-3 rounded-lg text-sm backdrop-blur-md border ${
                  msg.role === 'model' 
                    ? 'bg-violet-900/20 border-violet-500/30 text-violet-100 rounded-tl-none self-start mr-8' 
                    : 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100 rounded-tr-none self-end ml-8 text-right'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-right text-white/30 text-sm italic p-2">
                  System awaiting analysis request...
                </div>
              )}
           </div>

           {/* Controls */}
           <div className="flex gap-2">
             {/* Voice Button */}
             <button
                onClick={startListening}
                disabled={isAnalyzing || isListening}
                className={`p-3 rounded-full font-bold tracking-wider transition-all duration-300 border
                  ${isListening 
                    ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-cyan-400'
                  }
                  ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title="Voice Command"
             >
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
             </button>

             {/* AI Trigger Button */}
             <button
               onClick={() => handleAnalyze()}
               disabled={isAnalyzing || isListening}
               className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold tracking-wider transition-all duration-300
                 ${isAnalyzing 
                   ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-white/5' 
                   : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                 }`}
             >
               <Sparkles size={18} className={isAnalyzing ? "animate-spin" : ""} />
               {isAnalyzing ? "ANALYZING..." : "ANALYZE"}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}