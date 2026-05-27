// Custom crotchet (quarter note) SVG
const Crotchet = ({ size = 18 }) => (
  <svg
    width={size * 0.65}
    height={size}
    viewBox="0 0 13 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block"
    style={{ verticalAlign: 'baseline', marginBottom: '-2px' }}
  >
    {/* Stem */}
    <rect x="9" y="0" width="1.8" height="15" rx="0.9" />
    {/* Notehead (filled oval) */}
    <ellipse cx="5.5" cy="15.5" rx="5.5" ry="4" transform="rotate(-15 5.5 15.5)" />
  </svg>
);

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { text: 'text-xl', icon: 14 },
    md: { text: 'text-2xl', icon: 18 },
    lg: { text: 'text-5xl', icon: 36 },
  };
  const s = sizes[size];

  return (
    <span className={`${s.text} font-heading tracking-tight inline-flex items-baseline`}>
      Ca<Crotchet size={s.icon} />ence
    </span>
  );
}