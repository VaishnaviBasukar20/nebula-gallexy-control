import React, { useEffect, useRef } from 'react';
import { SimulationParams } from '../types';

interface GalaxyCanvasProps {
  params: React.MutableRefObject<SimulationParams>;
}

class Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  radius: number;
  angularSpeed: number;

  constructor(width: number, height: number) {
    this.x = width / 2;
    this.y = height / 2;
    this.z = Math.random() * 2; // Depth simulation
    this.vx = 0;
    this.vy = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.radius = Math.random() * (Math.min(width, height) / 3);
    this.angularSpeed = (0.02 + Math.random() * 0.05) * (Math.random() < 0.5 ? 1 : -1);
    this.size = Math.random() * 2 + 0.5;
    
    // Cosmic colors
    const colors = [
      'rgba(255, 255, 255, ',   // White
      'rgba(100, 200, 255, ',   // Cyan
      'rgba(200, 100, 255, ',   // Violet
      'rgba(255, 150, 50, '     // Orange/Gold
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(width: number, height: number, chaos: number, scale: number) {
    // Center point
    const cx = width / 2;
    const cy = height / 2;

    // Apply Scale (affects radius and attraction)
    // Scale 1.0 = Normal, Scale 0.0 = Singularity
    const targetRadius = this.radius * (0.1 + scale * 1.5);
    
    // Apply Chaos (affects jitter and orbit stability)
    const jitter = chaos * 5; 
    
    // Orbital Physics
    this.angle += this.angularSpeed * (1 + chaos * 2);
    
    // Calculate ideal position based on orbit
    const targetX = cx + Math.cos(this.angle) * targetRadius;
    const targetY = cy + Math.sin(this.angle) * targetRadius;

    // Move towards target with some elasticity
    this.x += (targetX - this.x) * 0.1;
    this.y += (targetY - this.y) * 0.1;

    // Add chaos
    this.x += (Math.random() - 0.5) * jitter;
    this.y += (Math.random() - 0.5) * jitter;
  }

  draw(ctx: CanvasRenderingContext2D, chaos: number) {
    const alpha = (0.3 + Math.random() * 0.7) * (1 - chaos * 0.5); // Flicker more with chaos
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color + alpha + ')';
    ctx.fill();
  }
}

const GalaxyCanvas: React.FC<GalaxyCanvasProps> = ({ params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Initialize Particles
  useEffect(() => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Create 800 particles
    particlesRef.current = Array.from({ length: 800 }, () => new Particle(width, height));
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Handle Resize
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const width = canvas.width;
      const height = canvas.height;
      const { chaos, scale } = params.current;

      // Clear with trail effect
      ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + chaos * 0.3})`; // Higher chaos = less trail
      ctx.fillRect(0, 0, width, height);

      // Draw Center Black Hole/Star
      const centerSize = 20 * scale + (Math.random() * 5 * chaos);
      ctx.beginPath();
      ctx.arc(width/2, height/2, centerSize, 0, Math.PI * 2);
      ctx.fillStyle = chaos > 0.8 ? 'white' : 'black';
      ctx.fill();
      
      // Glow
      const gradient = ctx.createRadialGradient(width/2, height/2, centerSize, width/2, height/2, centerSize * 4);
      gradient.addColorStop(0, chaos > 0.8 ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Update and Draw Particles
      ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
      particlesRef.current.forEach(p => {
        p.update(width, height, chaos, scale);
        p.draw(ctx, chaos);
      });
      ctx.globalCompositeOperation = 'source-over';

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [params]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-black"
    />
  );
};

export default GalaxyCanvas;