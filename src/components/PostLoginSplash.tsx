import { useState } from 'react';
import Logo from './Logo';

const splashVideoSrc = '/assets/post-login-splash.mp4';

export default function PostLoginSplash() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-black">
      {!videoFailed ? (
        <video
          className="h-full w-full object-cover"
          src={splashVideoSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#061329] px-6">
          <div className="rounded-[2rem] border border-white/15 bg-white/10 px-8 py-7 shadow-2xl backdrop-blur-2xl">
            <Logo size="lg" variant="light" />
          </div>
        </div>
      )}
    </div>
  );
}
