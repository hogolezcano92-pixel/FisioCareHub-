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
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex items-center justify-center"
      >
        {/* Home Care Icon: House + Professional Figure */}
        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#0EA5E9] rounded-2xl flex items-center justify-center shadow-md overflow-hidden relative">
          <svg
            width="75%"
            height="75%"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
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
          className="flex flex-col leading-tight"
        >
          <span className={cn(
            "font-sans font-black tracking-tight text-2xl sm:text-3xl",
            variant === 'dark' ? "text-[#0EA5E9]" : "text-white"
          )}>
            FisioCareHub
          </span>
          <span className={cn(
            "text-[10px] sm:text-[12px] font-medium tracking-wider",
            variant === 'dark' ? "text-slate-500" : "text-slate-300"
          )}>
            REABILITAÇÃO E PERFORMANCE
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default Logo;
