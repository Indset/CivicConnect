import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import civicQuotes from '@/data/civicQuotes';

export default function QuoteCard({
  initialIndex = 0,
  autoRotate = true,
  showNext = true,
  compact = false,
  className = '',
}) {
  const [index, setIndex] = useState(() => ((initialIndex % civicQuotes.length) + civicQuotes.length) % civicQuotes.length);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIndex(((initialIndex % civicQuotes.length) + civicQuotes.length) % civicQuotes.length);
  }, [initialIndex]);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    if (!autoRotate || paused) return undefined;
    const intervalId = window.setInterval(() => {
      setVisible(false);
      timeoutRef.current = window.setTimeout(() => {
        setIndex((current) => (current + 1) % civicQuotes.length);
        setVisible(true);
      }, 220);
    }, 8000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRotate, paused]);

  const showNextQuote = () => {
    window.clearTimeout(timeoutRef.current);
    setVisible(false);
    timeoutRef.current = window.setTimeout(() => {
      setIndex((current) => (current + 1) % civicQuotes.length);
      setVisible(true);
    }, 180);
  };

  return (
    <figure
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className={`flex items-start ${compact ? 'gap-2' : 'gap-3'}`}>
        <Quote
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-accent-500 ${compact ? 'h-4 w-4' : 'h-6 w-6'}`}
          fill="currentColor"
          strokeWidth={1.5}
        />
        <blockquote
          aria-live="polite"
          className={`font-heading font-semibold leading-relaxed transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          } ${compact ? 'text-xs text-slate-600' : 'text-base sm:text-lg'}`}
        >
          “{civicQuotes[index]}”
        </blockquote>
      </div>
      {showNext && (
        <button
          aria-label="Show next civic quote"
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg font-bold transition hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
            compact ? 'ml-6 text-[11px]' : 'ml-9 text-xs'
          }`}
          onClick={showNextQuote}
          type="button"
        >
          Next quote <ArrowRight aria-hidden="true" size={14} />
        </button>
      )}
    </figure>
  );
}
