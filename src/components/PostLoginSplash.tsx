import { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';

const splashVideoSrc = '/assets/post-login-splash.mp4';

export default function PostLoginSplash() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#061329]"
    >
      {!videoFailed ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={splashVideoSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_24%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_76%_72%,rgba(139,92,246,0.18),transparent_38%),linear-gradient(160deg,#061329_0%,#0b1630_48%,#11133a_100%)] px-6">
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] border border-white/15 bg-white/10 px-8 py-7 shadow-2xl backdrop-blur-2xl"
          >
            <Logo size="lg" variant="light" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
