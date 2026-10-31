import { useId } from 'react';

const controlClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-civic-600 focus:ring-4 focus:ring-civic-100 disabled:cursor-not-allowed disabled:bg-slate-50';

function FieldFrame({ id, label, hint, error, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-700" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ id, label, hint, error, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error}>
      <input
        className={`${controlClass} ${className}`}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
    </FieldFrame>
  );
}

export function Textarea({ id, label, hint, error, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error}>
      <textarea
        className={`${controlClass} resize-y ${className}`}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
    </FieldFrame>
  );
}

export function Select({ id, label, hint, error, className = '', children, ...props }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldFrame id={selectId} label={label} hint={hint} error={error}>
      <select
        className={`${controlClass} ${className}`}
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}
