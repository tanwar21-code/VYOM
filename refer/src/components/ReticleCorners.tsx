interface ReticleCornersProps {
  color?: string;
  size?: string;
}

export default function ReticleCorners({ color = '#FF9F43', size = 'w-3 h-3' }: ReticleCornersProps) {
  return (
    <>
      <span
        className={`absolute top-2 left-2 ${size} border-t-2 border-l-2 pointer-events-none transition-colors duration-300 z-10`}
        style={{ borderColor: color }}
        aria-hidden="true"
      />
      <span
        className={`absolute top-2 right-2 ${size} border-t-2 border-r-2 pointer-events-none transition-colors duration-300 z-10`}
        style={{ borderColor: color }}
        aria-hidden="true"
      />
      <span
        className={`absolute bottom-2 left-2 ${size} border-b-2 border-l-2 pointer-events-none transition-colors duration-300 z-10`}
        style={{ borderColor: color }}
        aria-hidden="true"
      />
      <span
        className={`absolute bottom-2 right-2 ${size} border-b-2 border-r-2 pointer-events-none transition-colors duration-300 z-10`}
        style={{ borderColor: color }}
        aria-hidden="true"
      />
    </>
  );
}
