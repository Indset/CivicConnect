import { createElement } from 'react';

export default function Card({ children, className = '', as: Element = 'section', ...props }) {
  return createElement(
    Element,
    {
      className: `rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_36px_-24px_rgba(15,35,48,0.28)] ${className}`,
      ...props,
    },
    children,
  );
}
