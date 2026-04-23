import { useState, useRef, useEffect } from 'react';

interface Props {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ text, placement = 'top' }: Props) {
  const [open, setOpen] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Close on outside click (useful for mobile tap behavior)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (iconRef.current?.contains(e.target as Node)) return;
      if (tipRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const placementClass =
    placement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
    : placement === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2'
    : placement === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2'
    : 'left-full ml-2 top-1/2 -translate-y-1/2';

  return (
    <span className="relative inline-flex">
      <button
        ref={iconRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="relative inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-slate-500 bg-slate-200/80 hover:bg-indigo-500 hover:text-white transition-colors cursor-help flex-shrink-0 before:content-[''] before:absolute before:-inset-3 before:rounded-full"
        aria-label="הסבר"
      >
        ?
      </button>
      {open && (
        <div
          ref={tipRef}
          className={`absolute ${placementClass} z-[2000] w-64 md:w-72 px-3.5 py-2.5 rounded-xl text-[12px] md:text-[13px] leading-relaxed text-right pointer-events-none shadow-xl`}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            direction: 'rtl',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
