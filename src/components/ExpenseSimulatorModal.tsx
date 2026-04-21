import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpTooltip } from './HelpTooltip';

interface Props {
  onClose: () => void;
  /** Current value in the main expenses slider — shown as reference only */
  currentValue: number;
}

type Preset = 'saver' | 'balanced' | 'generous' | 'custom';

interface Category {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  saver: number;
  balanced: number;
  generous: number;
  help: string;
}

const CATEGORIES: Category[] = [
  {
    key: 'food',
    label: '🍞 מזון (סופר + חוץ)',
    min: 2500, max: 10000, step: 100,
    saver: 4500, balanced: 5500, generous: 7000,
    help: 'מזון הוא הסעיף הגדול ביותר. למ״ס 2023: ממוצע משק בית ~2,825 ₪ (3.1 נפשות). למשפחה של 6 × 1.7 ≈ 4,800. כולל: סופר, שוק, אוכל חוץ, קפה, משלוחים. חיסכון: בישול בית, ללא Ubereats. יקר: אוכל אורגני, יין, מסעדות שבועיות.'
  },
  {
    key: 'transport',
    label: '🚗 תחבורה (רכב + דלק + תחב״צ)',
    min: 1000, max: 8000, step: 100,
    saver: 2500, balanced: 3500, generous: 4500,
    help: 'CarBuyer 2025: רכב אחד מלא (פחת + ביטוחים + דלק + טסט + שירות) עולה 2,000-2,800 ₪/חודש. שני רכבים: 4,000-5,500. ליסינג מסיט את המבנה אבל העלות הכלכלית דומה. בישראל: רוב המשפחות upper-middle עם ילדים = 2 רכבים.'
  },
  {
    key: 'education',
    label: '🎓 חינוך (4 ילדים: צהרון, חוגים, מורים)',
    min: 500, max: 12000, step: 100,
    saver: 3500, balanced: 5000, generous: 7500,
    help: 'צהרון (ילד): מסובסד 672-985 ₪, פרטי 985-1,200. 4 ילדים בשיא = 1,500-3,000 ₪/חודש. חוגים (פעמונים 2024): ממוצע 339-525 ₪/ילד, 4 ילדים = 1,200-2,000 ₪. מורה פרטי: 100-150 ₪/שעה. לא כולל: חסכון לבר מצווה (sinking fund נפרד).'
  },
  {
    key: 'health',
    label: '💊 בריאות (ביטוחים + שיניים + טיפולים)',
    min: 200, max: 3000, step: 50,
    saver: 600, balanced: 1000, generous: 1700,
    help: 'משלים בסיסי (שב״ן): 150-350 ₪/חודש ל-6 נפשות. ביטוח פרטי מורחב (הראל/כלל/פניקס — אמבולטורי+ניתוחים): 600-1,500 ₪/חודש. ביטוח שיניים: +200-400. טיפולים נוספים (פסיכולוג, קלינאית תקשורת, פיזיו) שלא מכוסים: 300-800/חודש.'
  },
  {
    key: 'clothing',
    label: '👕 הלבשה וטיפוח (6 אנשים)',
    min: 300, max: 3500, step: 50,
    saver: 800, balanced: 1200, generous: 2000,
    help: 'הלבשה + הנעלה + טיפוח אישי למשפחה של 6. ילדים גדלים מהר — החלפות מתמדות. כולל: בגדים, נעליים, בגדי ים, מספרה, קוסמטיקה. חיסכון: Outlet, Shein, יד שנייה. יקר: מותגים, בוטיקים.'
  },
  {
    key: 'home',
    label: '🛋 ריהוט וכלי בית (ללא דיור עצמו)',
    min: 100, max: 2500, step: 50,
    saver: 500, balanced: 800, generous: 1400,
    help: 'החלפות ותחזוקה שוטפת (לא שיפוץ גדול): כלי בית, מגבות, מצעים, קטנה של קפה, רמקול, ריהוט נקודתי. משפחה של 6 שוברת/מחליפה יותר. לא כולל: שיפוצים גדולים (מגיע דרך "שיפוץ" בסעיף הבית).'
  },
  {
    key: 'comm',
    label: '📱 תקשורת (סלולר + אינטרנט + סטרימינג)',
    min: 200, max: 1500, step: 50,
    saver: 350, balanced: 500, generous: 800,
    help: 'סלולר × 2-4 (הורים + מתבגרים): 50-100 ₪/קו. אינטרנט בבית (סיב אופטי): 100-200 ₪. סטרימינג (Netflix/Disney/YouTube Premium/Spotify): 100-200 ₪. סה״כ למשפחה עם ילדים מתבגרים: 400-700 ₪.'
  },
  {
    key: 'leisure',
    label: '✈️ פנאי, תרבות, חופשות',
    min: 500, max: 8000, step: 100,
    saver: 1500, balanced: 2500, generous: 4500,
    help: 'חופשה פרוסה שנתית (טיול גדול): 20-60K/שנה = 1,700-5,000 ₪/חודש. בנוסף: מסעדות/בתי קפה, קולנוע, פעילויות ילדים (לונה פארק, מוזיאונים), חגיגות חגים. משפחה של 6 = כל חוויה × 6. חיסכון: Airbnb, חופשות בארץ.'
  },
  {
    key: 'services',
    label: '👥 שירותים (מנקה, בייביסיטר, מתנות)',
    min: 200, max: 5000, step: 100,
    saver: 1000, balanced: 1500, generous: 2500,
    help: 'מנקה שבועית: 800-1,200 ₪/חודש (ישראל 2026). בייביסיטר/שמרטפית: 60-80 ₪/שעה. מתנות (ברית, חתונות, בר מצוות, יום הולדת) למשפחה ישראלית גדולה: 300-800 ₪/חודש. שיפוצי רכב/בית קטנים, משרד דואר.'
  },
  {
    key: 'misc',
    label: '📎 שונות (ביטוחי חיים, צדקה, בופר)',
    min: 100, max: 2500, step: 50,
    saver: 500, balanced: 800, generous: 1200,
    help: 'ביטוחי חיים ואובדן כושר עבודה (חוץ מהפנסיה): 200-600 ₪/חודש. צדקה/מעשרות/תרומות: 300-1,500 ₪. בופר לאירועים לא צפויים: 200-500 ₪. גם הוצאות קטנות שנשכחו.'
  },
];

export function ExpenseSimulatorModal({ onClose, currentValue }: Props) {
  return createPortal(<ExpenseSimulatorContent onClose={onClose} currentValue={currentValue} />, document.body);
}

function ExpenseSimulatorContent({ onClose, currentValue }: Props) {
  // Initialize with 'balanced' preset values
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    CATEGORIES.forEach(c => { init[c.key] = c.balanced; });
    return init;
  });
  const [activePreset, setActivePreset] = useState<Preset>('balanced');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const total = Object.values(values).reduce((sum, v) => sum + v, 0);
  const diffFromCurrent = total - currentValue;

  const applyPreset = (preset: Preset) => {
    if (preset === 'custom') return;
    const newValues: Record<string, number> = {};
    CATEGORIES.forEach(c => { newValues[c.key] = c[preset]; });
    setValues(newValues);
    setActivePreset(preset);
  };

  const updateValue = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  };

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(String(Math.round(total)));
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start md:items-center justify-center p-3 md:p-8 overflow-y-auto fade-up"
      style={{ background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-3xl my-4 md:my-auto rounded-[2rem] border border-white/80 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', boxShadow: '0 30px 80px -20px rgba(15, 23, 42, 0.5)' }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-l from-rose-500 to-pink-500 px-5 md:px-8 py-5 md:py-7 rounded-t-[2rem] overflow-hidden">
          <div className="absolute top-0 left-10 w-32 h-32 bg-white/15 rounded-full blur-3xl float-anim" />
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white text-xl transition-colors"
            aria-label="סגור"
          >✕</button>
          <div className="relative z-10">
            <p className="text-white/80 text-[11px] font-bold uppercase tracking-[0.25em] mb-2">סימולטור עזר</p>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white leading-tight">
              חישוב הוצאות אישי
            </h2>
            <p className="text-white/90 text-sm md:text-base mt-1.5 leading-snug">
              ללא דיור · מבוסס על למ״ס 2023, עדכון 2026
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 md:px-8 py-5 md:py-7 space-y-5">
          {/* Info banner */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-slate-700 leading-relaxed">
            <p className="flex items-start gap-2">
              <span className="text-indigo-500 text-lg flex-shrink-0">ℹ️</span>
              <span>
                כלי עזר לחישוב הוצאות. <strong>הסימולטור לא מעדכן את המכוון בגרף אוטומטית</strong> —
                אחרי שתגיעו למספר שנוח לכם, העבירו אותו ידנית לשדה "הוצאות (ללא דיור)". אפשר להתחיל מ-preset ולכוונן.
              </span>
            </p>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600 mb-2">🎚 בחירה מהירה</p>
            <div className="grid grid-cols-3 gap-2">
              <PresetButton
                active={activePreset === 'saver'}
                label="חסכן"
                sublabel="~16K"
                desc="חיים מינימליסטיים, חיסכון גבוה"
                onClick={() => applyPreset('saver')}
              />
              <PresetButton
                active={activePreset === 'balanced'}
                label="מאוזן"
                sublabel="~22K"
                desc="upper-middle סטנדרט, נוח"
                onClick={() => applyPreset('balanced')}
              />
              <PresetButton
                active={activePreset === 'generous'}
                label="נדיב"
                sublabel="~33K"
                desc="חיים מפנקים, 2 רכבים, חינוך פרטי"
                onClick={() => applyPreset('generous')}
              />
            </div>
          </div>

          {/* Category sliders */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">📋 כוונון אישי</p>
            {CATEGORIES.map(cat => (
              <CategorySlider
                key={cat.key}
                category={cat}
                value={values[cat.key]}
                onChange={v => updateValue(cat.key, v)}
              />
            ))}
          </div>

          {/* Total */}
          <div className="sticky bottom-0 -mx-4 md:-mx-8 -mb-5 md:-mb-7 px-4 md:px-8 py-4 border-t-2 border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 rounded-b-[2rem]">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">סה״כ חודשי משוער</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  ללא דיור, חסכונות ומסים
                </p>
              </div>
              <span className="num font-display text-3xl md:text-4xl font-extrabold text-rose-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(total).toLocaleString('he-IL')} ₪
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-3">
              <div className="text-xs text-slate-600 leading-snug">
                <p>
                  <span className="font-semibold">בגרף כרגע:</span>{' '}
                  <span className="num font-bold">{currentValue.toLocaleString('he-IL')} ₪</span>
                </p>
                <p className={diffFromCurrent === 0 ? 'text-slate-500' : diffFromCurrent > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {diffFromCurrent === 0 ? 'זהה לערך הנוכחי'
                    : diffFromCurrent > 0 ? `+${fmt(diffFromCurrent)} ₪ יותר מהערך הנוכחי`
                    : `${fmt(Math.abs(diffFromCurrent))} ₪ פחות מהערך הנוכחי`}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex-shrink-0 px-3 py-2 text-xs md:text-sm font-semibold rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors"
                aria-label="העתק סכום"
                title="העתק את הסכום לזיכרון"
              >
                📋 העתק סכום
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 md:px-8 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-[2rem] gap-3">
          <p className="text-[11px] md:text-xs text-slate-500 leading-snug">
            💡 אחרי בחירה — העבירו את המספר ידנית לשדה "הוצאות (ללא דיור)"
          </p>
          <button
            onClick={onClose}
            className="btn-primary px-5 py-2 text-sm md:text-base flex-shrink-0"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ active, label, sublabel, desc, onClick }: {
  active: boolean; label: string; sublabel: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-right border-2 transition-all ${
        active
          ? 'bg-rose-500 border-rose-500 text-white shadow-md scale-[1.02]'
          : 'bg-white border-slate-200 text-slate-800 hover:border-rose-300 hover:bg-rose-50'
      }`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-display text-base md:text-lg font-extrabold">{label}</span>
        <span className={`num text-[11px] md:text-xs font-bold ${active ? 'text-white/90' : 'text-rose-600'}`}>
          {sublabel}
        </span>
      </div>
      <p className={`text-[10px] md:text-[11px] leading-tight mt-0.5 ${active ? 'text-white/80' : 'text-slate-500'}`}>
        {desc}
      </p>
    </button>
  );
}

function CategorySlider({ category, value, onChange }: {
  category: Category; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          {category.label}
          <HelpTooltip text={category.help} />
        </label>
        <span className="num font-display text-base md:text-lg font-extrabold text-rose-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value.toLocaleString('he-IL')} ₪
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={category.min}
        max={category.max}
        step={category.step}
      />
      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 num" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span>{category.min.toLocaleString('he-IL')}</span>
        <span className="text-slate-500">
          חסכן: {category.saver.toLocaleString('he-IL')} · מאוזן: {category.balanced.toLocaleString('he-IL')} · נדיב: {category.generous.toLocaleString('he-IL')}
        </span>
        <span>{category.max.toLocaleString('he-IL')}</span>
      </div>
    </div>
  );
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('he-IL');
}
