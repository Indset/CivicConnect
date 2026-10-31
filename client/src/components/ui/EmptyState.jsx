import QuoteCard from '@/components/ui/QuoteCard';
import { getDailyCivicQuoteIndex } from '@/data/civicQuotes';

export default function EmptyState({ title, description, action, icon = '✦', className = '' }) {
  return (
    <div
      className={`grid justify-items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-2xl bg-civic-50 text-xl text-civic-700"
      >
        {icon}
      </span>
      <h3 className="mt-4 font-heading text-lg font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
      <QuoteCard
        compact
        initialIndex={getDailyCivicQuoteIndex()}
        autoRotate={false}
        showNext={false}
        className="mt-5 max-w-sm text-left"
      />
    </div>
  );
}
