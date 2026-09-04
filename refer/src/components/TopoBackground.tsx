export default function TopoBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.038] overflow-hidden select-none z-0">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="topoPattern" width="480" height="480" patternUnits="userSpaceOnUse">
            {/* Topographic elevation contours */}
            <path
              d="M0,240 Q120,160 240,240 T480,240"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
            <path
              d="M0,190 Q120,110 240,190 T480,190"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            <path
              d="M0,290 Q120,210 240,290 T480,290"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            <path
              d="M0,140 Q120,60 240,140 T480,140"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
            <path
              d="M0,340 Q120,260 240,340 T480,340"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
            <circle
              cx="240"
              cy="240"
              r="70"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.9"
              strokeDasharray="4 4"
            />
            <circle cx="240" cy="240" r="130" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
            <circle cx="90" cy="90" r="50" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
            <circle cx="390" cy="380" r="80" fill="none" stroke="#FFFFFF" strokeWidth="0.7" />
            <line x1="230" y1="240" x2="250" y2="240" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="240" y1="230" x2="240" y2="250" stroke="#FFFFFF" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topoPattern)" />
      </svg>
    </div>
  );
}
