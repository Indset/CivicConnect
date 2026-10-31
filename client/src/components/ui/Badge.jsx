const styles = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  under_review: 'bg-violet-50 text-violet-800 ring-violet-200',
  assigned: 'bg-sky-50 text-sky-800 ring-sky-200',
  in_progress: 'bg-blue-50 text-blue-800 ring-blue-200',
  resolved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  closed: 'bg-slate-100 text-slate-700 ring-slate-200',
  upcoming: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  completed: 'bg-slate-100 text-slate-700 ring-slate-200',
  submitted: 'bg-amber-50 text-amber-800 ring-amber-200',
};

const labels = {
  submitted: 'Pending',
  under_review: 'Under review',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};

export default function Badge({ status, children, className = '' }) {
  const key = String(status ?? '').toLowerCase().replaceAll(' ', '_');
  const label = children ?? labels[key] ?? status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles[key] ?? 'bg-slate-100 text-slate-700 ring-slate-200'} ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}
