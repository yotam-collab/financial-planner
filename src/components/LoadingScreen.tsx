import { useEffect, useRef, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const FADE_MS = 700;

/**
 * Opening splash: plays the video rendered from splash/ (HyperFrames source,
 * re-render with splash/render.sh), then fades into the app.
 */
export function LoadingScreen({ onComplete }: Props) {
  const [exiting, setExiting] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const [cut] = useState(() =>
    window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape',
  );
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // still = show the poster (last frame) instead of playing: motion is off or autoplay is blocked
  const [still, setStill] = useState(reduced);
  const src = `${import.meta.env.BASE_URL}splash-${cut}`;

  useEffect(() => {
    const exit = () => setExiting(true);
    // The poster holds briefly; the 6s cap covers a video that stalls on a bad connection.
    let t = setTimeout(exit, reduced ? 1500 : 6000);
    if (!reduced) {
      video.current?.play().catch(() => {
        setStill(true);
        clearTimeout(t);
        t = setTimeout(exit, 1500);
      });
    }
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onComplete, FADE_MS);
    return () => clearTimeout(t);
  }, [exiting, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#221935] transition-opacity duration-700 ease-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-busy="true"
      aria-label="טוען את המודל הפיננסי"
    >
      <video
        ref={video}
        className="w-full h-full object-cover"
        src={`${src}.mp4`}
        poster={still ? `${src}.jpg` : undefined}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={() => setExiting(true)}
        onError={() => setExiting(true)}
      />
    </div>
  );
}
