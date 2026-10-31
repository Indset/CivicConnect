export default function Avatar({ name = '', imageUrl = '', size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CC';

  return imageUrl ? (
    <img
      alt={name ? `${name} avatar` : 'User avatar'}
      className={`${sizeClasses[size] ?? sizeClasses.md} rounded-full object-cover ring-2 ring-white ${className}`}
      src={imageUrl}
    />
  ) : (
    <span
      aria-label={name || 'CivicConnect user'}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-civic-100 font-bold text-civic-800 ring-2 ring-white ${sizeClasses[size] ?? sizeClasses.md} ${className}`}
      role="img"
    >
      {initials}
    </span>
  );
}
