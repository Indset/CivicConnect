import { useEffect, useId, useRef } from 'react';

export default function Modal({ open, title, description, onClose, children, size = 'max-w-lg' }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => [...dialogRef.current.querySelectorAll(focusableSelector)];
    const firstFocusable = focusableElements()[0];
    (firstFocusable ?? dialogRef.current).focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-modal="true"
        className={`my-auto w-full ${size} rounded-2xl border border-white/60 bg-white p-6 shadow-2xl`}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-600" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          <button
            aria-label="Close dialog"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-civic-600"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
