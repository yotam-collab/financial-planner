import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
  /** Minimum time to show (ms) before starting fade-out. */
  minDuration?: number;
}

/**
 * Opening loading animation. Shows a "speeder-style" kinetic loader built
 * around the couple's avatar, with sweeping motion lines in the app's
 * indigo/violet/pink palette. Fades out after minDuration + 700ms.
 */
export function LoadingScreen({ onComplete, minDuration = 2400 }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), minDuration);
    const t2 = setTimeout(() => onComplete(), minDuration + 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-700 ease-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#f1f5f9',
        backgroundImage:
          'radial-gradient(ellipse 900px 700px at 15% 10%, rgba(79, 70, 229, 0.18), transparent 55%),' +
          'radial-gradient(ellipse 800px 600px at 85% 5%, rgba(124, 58, 237, 0.16), transparent 55%),' +
          'radial-gradient(ellipse 700px 500px at 50% 40%, rgba(236, 72, 153, 0.12), transparent 65%),' +
          'radial-gradient(ellipse 800px 600px at 5% 80%, rgba(16, 185, 129, 0.12), transparent 55%),' +
          'radial-gradient(ellipse 900px 700px at 95% 95%, rgba(245, 158, 11, 0.14), transparent 55%)',
      }}
      dir="rtl"
      aria-busy="true"
      aria-label="טוען את המודל הפיננסי"
    >
      {/* Long sweeping background lines */}
      <div className="loader-longfazers" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Main content — LTR container so the speed-lines physics work naturally */}
      <div className="relative w-full h-full flex flex-col items-center justify-center px-6" dir="ltr">
        {/* Avatar cluster with speeder jitter */}
        <div className="relative mb-8 md:mb-10">
          <div className="loader-speeder relative">
            {/* Halo glow */}
            <div
              className="absolute inset-0 -m-10 rounded-full blur-3xl loader-halo"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(circle, rgba(124, 58, 237, 0.55), rgba(236, 72, 153, 0.25) 45%, transparent 70%)',
              }}
            />

            {/* Avatar with gradient ring */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 p-1 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.45)]">
              <img
                src={`${import.meta.env.BASE_URL}profile-small.jpeg`}
                alt=""
                className="w-full h-full rounded-full object-cover"
                draggable={false}
              />
            </div>

            {/* Trailing motion lines from avatar */}
            <div className="loader-fazers" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        {/* Text block */}
        <div className="text-center max-w-xl relative z-10" dir="rtl">
          <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.28em] mb-3 loader-fade-in-1">
            יותם והדס <span className="text-slate-400 mx-1">·</span> תכנון פיננסי
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[0.95] loader-fade-in-2">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">
              ניהול סיכונים
            </span>
          </h1>
          <p className="font-he text-sm md:text-base text-slate-500 mt-4 loader-fade-in-3">
            מחשב את העתיד הכלכלי שלכם<span className="loader-dots" />
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8 md:mt-10 w-56 md:w-64 h-[3px] rounded-full overflow-hidden bg-slate-200/70 relative loader-fade-in-3">
          <div className="loader-progress absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />
        </div>
      </div>

      {/* Corner: status (top-right in RTL = top-right physically) */}
      <div
        className="absolute top-6 md:top-8 right-6 md:right-8 flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-slate-500"
        dir="rtl"
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 loader-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="uppercase tracking-[0.22em]">המערכת פעילה</span>
      </div>

      {/* Corner: meta (top-left) */}
      <div
        className="hidden md:block absolute top-8 left-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em] text-left"
        dir="ltr"
      >
        <span className="num">v2.0</span>
        <span className="mx-1.5 text-slate-300">//</span>
        <span>Vite · React</span>
      </div>

      {/* Corner: footer brand (bottom) */}
      <div
        className="absolute bottom-6 md:bottom-8 right-0 left-0 flex items-center justify-center gap-2 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]"
        dir="rtl"
      >
        <span>מודל פיננסי אישי</span>
      </div>
    </div>
  );
}
