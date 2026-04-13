import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  iconOnly = false, 
  variant = 'dark',
  size = 'md'
}) => {
  const sizes = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24'
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  };

  return (
    <div className={cn("flex items-center gap-4 select-none group", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex items-center justify-center"
      >
        {/* Premium Background Glow */}
        <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full group-hover:bg-blue-400/30 transition-all duration-500" />
        
        {/* Home Care Icon: House + Professional Figure */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] rounded-[1.5rem] flex items-center justify-center shadow-xl overflow-hidden relative border border-white/20">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
              <path d="M0 0L100 100M100 0L0 100" stroke="white" strokeWidth="1" />
            </svg>
          </div>
          
          <svg
            width="70%"
            height="70%"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10"
          >
            {/* House Outline */}
            <motion.path
              d="M10 45 L 50 15 L 90 45 V 85 H 10 V 45 Z"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />
            
            {/* Professional Figure (Therapist) */}
            <motion.circle
              cx="50"
              cy="45"
              r="8"
              fill="white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            />
            <motion.path
              d="M35 75 C 35 60, 65 60, 65 75"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            />
            
            {/* Care/Healing Sparkle */}
            <motion.path
              d="M75 25 L 85 25 M 80 20 L 80 30"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            />
          </svg>
        </div>
      </motion.div>

      {!iconOnly && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col leading-none whitespace-nowrap"
        >
          <span className={cn(
            "font-sans font-black tracking-tighter text-2xl sm:text-4xl drop-shadow-sm",
            variant === 'dark' ? "text-slate-900" : "text-[#38BDF8]"
          )}>
            FisioCareHub
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn("h-[2px] w-4 rounded-full", variant === 'dark' ? "bg-[#0EA5E9]" : "bg-[#38BDF8]")} />
            <span className={cn(
              "text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em]",
              variant === 'dark' ? "text-slate-400" : "text-[#9CA3AF]"
            )}>
              Reabilitação & Performance
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Logo;
