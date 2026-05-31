import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  textOnly?: boolean;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  iconOnly = false, 
  textOnly = false,
  variant = 'dark',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: {
      icon: "w-8 h-8 rounded-xl",
      text: "text-lg sm:text-xl",
      tagline: "text-[6px] sm:text-[7px]",
      gap: "gap-2"
    },
    md: {
      icon: "w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem]",
      text: "text-2xl sm:text-4xl",
      tagline: "text-[8px] sm:text-[10px]",
      gap: "gap-4"
    },
    lg: {
      icon: "w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem]",
      text: "text-3xl sm:text-5xl",
      tagline: "text-[10px] sm:text-[12px]",
      gap: "gap-6"
    },
    xl: {
      icon: "w-20 h-20 sm:w-24 sm:h-24 rounded-[2.5rem]",
      text: "text-4xl sm:text-6xl",
      tagline: "text-[12px] sm:text-[14px]",
      gap: "gap-8"
    }
  };

  return (
    <div className={cn("flex items-center select-none group", sizeClasses[size].gap, className)}>
      {!textOnly && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex items-center justify-center"
        >
          {/* Premium Background Glow */}
          <div className="absolute inset-0 bg-sky-400/20 blur-2xl rounded-full group-hover:bg-violet-400/25 transition-all duration-500" />
          
          {/* Home Care Icon: House + Professional Figure */}
          <div className={cn(
            "bg-gradient-to-br from-[#0EA5E9] via-[#2563EB] to-[#7C3AED] flex items-center justify-center shadow-xl shadow-blue-950/25 overflow-hidden relative border border-white/20 ring-1 ring-white/10",
            sizeClasses[size].icon
          )}>
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
      )}

      {!iconOnly && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col leading-none whitespace-nowrap"
        >
          <span
            className={cn(
              "font-sans font-black tracking-tighter bg-clip-text text-transparent",
              "drop-shadow-[0_0_18px_rgba(56,189,248,0.18)]",
              sizeClasses[size].text,
              variant === 'dark'
                ? "bg-gradient-to-r from-sky-600 via-violet-600 to-slate-900 dark:from-sky-400 dark:via-violet-400 dark:to-white"
                : "bg-gradient-to-r from-sky-500 via-violet-500 to-slate-800 dark:from-sky-400 dark:via-violet-400 dark:to-white"
            )}
          >
            FisioCareHub
          </span>

          <div className="flex flex-col mt-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-[2px] w-3 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.45)]",
                  variant === 'dark'
                    ? "bg-[#0EA5E9]"
                    : "bg-[#0EA5E9]"
                )}
              />
              <span
                className={cn(
                  "font-black uppercase tracking-[0.15em]",
                  sizeClasses[size].tagline,
                  variant === 'dark'
                    ? "text-slate-600 dark:text-slate-300"
                    : "text-slate-700 dark:text-slate-300"
                )}
              >
                Reabilitação
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-[1px] w-3 bg-transparent" />
              <span
                className={cn(
                  "font-black uppercase tracking-[0.15em]",
                  sizeClasses[size].tagline,
                  variant === 'dark'
                    ? "text-slate-600 dark:text-slate-300"
                    : "text-slate-700 dark:text-slate-300"
                )}
              >
                & Performance
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Logo;
