export function FloatingIngredients() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Top-Left: Rosemary Sprig */}
      <div className="float-ingredient absolute -left-4 top-16 sm:left-8 sm:top-20 opacity-30">
        <svg width="136" height="176" viewBox="0 0 136 176" fill="none">
          <path
            d="M32 162C48 124 72 78 106 20"
            stroke="#5D7B5F"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M50 132C34 126 24 114 20 102C34 108 44 118 50 132Z" fill="#5D7B5F" />
          <path d="M54 128C68 128 82 122 92 112C76 112 64 118 54 128Z" fill="#6F8F72" />
          <path d="M64 104C48 98 38 86 34 74C48 80 58 90 64 104Z" fill="#6F8F72" />
          <path d="M68 100C82 100 96 94 106 84C90 84 78 90 68 100Z" fill="#5D7B5F" />
          <path d="M78 76C64 70 54 58 50 46C64 52 72 62 78 76Z" fill="#5D7B5F" />
          <path d="M82 72C96 72 108 66 118 56C102 56 92 62 82 72Z" fill="#6F8F72" />
          <path d="M92 48C80 42 72 32 68 20C80 26 88 36 92 48Z" fill="#6F8F72" />
          <path d="M96 44C108 42 118 36 126 28C112 30 104 36 96 44Z" fill="#5D7B5F" />
        </svg>
      </div>

      {/* Top-Right: Sliced Lemon Half */}
      <div className="float-ingredient-delayed absolute -right-6 top-20 sm:right-10 sm:top-24 opacity-30">
        <svg width="132" height="132" viewBox="0 0 132 132" fill="none">
          <circle cx="66" cy="66" r="52" fill="#E3BE52" />
          <circle cx="66" cy="66" r="45" fill="#FAF4DC" />
          <circle cx="66" cy="66" r="39" fill="#E9CA68" />
          <line x1="66" y1="26" x2="66" y2="106" stroke="#FAF4DC" strokeWidth="3" />
          <line x1="26" y1="66" x2="106" y2="66" stroke="#FAF4DC" strokeWidth="3" />
          <line x1="38" y1="38" x2="94" y2="94" stroke="#FAF4DC" strokeWidth="3" />
          <line x1="94" y1="38" x2="38" y2="94" stroke="#FAF4DC" strokeWidth="3" />
          <circle cx="66" cy="66" r="5" fill="#FAF4DC" />
        </svg>
      </div>

      {/* Mid-Left: Cinnamon Stick Quills (soft blur depth) */}
      <div className="float-ingredient-delayed hidden md:block absolute left-12 bottom-36 opacity-25 blur-[0.8px]">
        <svg width="138" height="108" viewBox="0 0 138 108" fill="none">
          <g transform="rotate(-24 68 54)">
            <rect x="14" y="38" width="108" height="16" rx="8" fill="#A95C34" />
            <rect x="20" y="50" width="104" height="15" rx="7.5" fill="#8C4926" />
            <ellipse cx="120" cy="46" rx="5" ry="8" fill="#6F371B" />
            <ellipse cx="122" cy="57.5" rx="5" ry="7.5" fill="#5D2D15" />
          </g>
        </svg>
      </div>

      {/* Bottom-Right: Vanilla Bean Pod */}
      <div className="float-ingredient hidden sm:block absolute right-8 bottom-24 opacity-30">
        <svg width="150" height="130" viewBox="0 0 150 130" fill="none">
          <path
            d="M18 108C52 96 98 62 132 16"
            stroke="#593E2E"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M28 116C66 98 104 68 126 34"
            stroke="#73513D"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="48" cy="72" r="2" fill="#73513D" />
          <circle cx="56" cy="64" r="1.5" fill="#73513D" />
          <circle cx="42" cy="82" r="1.5" fill="#73513D" />
        </svg>
      </div>

      {/* Scattered Peppercorns */}
      <div className="float-ingredient absolute left-1/4 top-14 hidden lg:block opacity-25 blur-[0.5px]">
        <svg width="90" height="70" viewBox="0 0 90 70" fill="none">
          <circle cx="16" cy="22" r="4.5" fill="#3B3530" />
          <circle cx="38" cy="14" r="3.5" fill="#544C45" />
          <circle cx="52" cy="36" r="5" fill="#3B3530" />
          <circle cx="28" cy="48" r="4" fill="#544C45" />
          <circle cx="72" cy="24" r="3.5" fill="#3B3530" />
        </svg>
      </div>

      {/* Flour Dust Particles */}
      <div className="float-ingredient-delayed absolute right-1/4 top-28 hidden lg:block opacity-35 blur-[1px]">
        <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
          <circle cx="18" cy="20" r="3" fill="#C4622D" fillOpacity="0.45" />
          <circle cx="46" cy="12" r="2" fill="#A09D99" />
          <circle cx="74" cy="34" r="3.5" fill="#D4C7B4" />
          <circle cx="102" cy="18" r="2.5" fill="#C4622D" fillOpacity="0.35" />
          <circle cx="118" cy="52" r="4" fill="#D4C7B4" />
          <circle cx="60" cy="62" r="2.5" fill="#A09D99" />
        </svg>
      </div>
    </div>
  );
}
