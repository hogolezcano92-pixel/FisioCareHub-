import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const NOISE_SVG = "data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 40;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 0.3 - 0.15;
        this.speedY = Math.random() * 0.3 - 0.15;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = 'rgba(229, 231, 235, 0.12)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="fixed inset-0 z-0 bg-[#0B0F19] overflow-hidden pointer-events-none">
      {/* Background Blobs */}
      <div className="absolute inset-0">
        {/* Blob 1: Violet */}
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full opacity-50 mix-blend-screen animate-blob-float"
          style={{
            background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
        
        {/* Blob 2: Cyan */}
        <motion.div
          className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full opacity-50 mix-blend-screen animate-blob-float"
          style={{
            background: 'radial-gradient(circle, #0891b2 0%, transparent 70%)',
            filter: 'blur(80px)',
            animationDelay: '-5s'
          }}
        />

        {/* Blob 3: Pink */}
        <motion.div
          className="absolute top-[20%] right-[10%] w-[45%] h-[45%] rounded-full opacity-50 mix-blend-screen animate-blob-float"
          style={{
            background: 'radial-gradient(circle, #be185d 0%, transparent 70%)',
            filter: 'blur(80px)',
            animationDelay: '-10s'
          }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
      />
      
      {/* Dynamic Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};
