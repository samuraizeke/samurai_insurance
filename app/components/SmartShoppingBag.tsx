type SmartShoppingBagProps = {
  className?: string;
};

export function SmartShoppingBag({ className = "" }: SmartShoppingBagProps) {
  return (
    <div
      className={`feature-bag relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[360px] ${className}`}
      aria-hidden="true"
    >
      <div className="feature-bag__halo" />
      <div className="feature-bag__glow" />
      <svg
        viewBox="0 0 240 240"
        className="feature-bag__svg"
        role="presentation"
      >
        <defs>
          <linearGradient
            id="bagBodyGradient"
            x1="120"
            y1="64"
            x2="120"
            y2="212"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5cafc1" />
            <stop offset="0.55" stopColor="#ffebd3" />
            <stop offset="1" stopColor="#de5e48" />
          </linearGradient>
          <linearGradient
            id="bagPanelGradient"
            x1="120"
            y1="92"
            x2="120"
            y2="212"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffebd3" />
            <stop offset="1" stopColor="#de5e48" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient
            id="bagHandleGradient"
            x1="120"
            y1="52"
            x2="120"
            y2="108"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5cafc1" />
            <stop offset="1" stopColor="#de5e48" />
          </linearGradient>
        </defs>

        <g className="feature-bag__handles">
          <path
            className="feature-bag__handle feature-bag__handle--left"
            d="M68 94c0-36 24-60 52-60s52 24 52 60"
          />
          <path
            className="feature-bag__handle feature-bag__handle--right"
            d="M80 96c0-28 18-42 40-42s40 14 40 42"
          />
        </g>

        <path
          className="feature-bag__body"
          d="M40 96h160l-24 112H64L40 96Z"
          fill="url(#bagBodyGradient)"
        />
        <path
          className="feature-bag__panel"
          d="M68 110h104l-16 88H84l-16-88Z"
          fill="url(#bagPanelGradient)"
        />

        <g className="feature-bag__straps">
          <line x1="104" y1="112" x2="94" y2="204" />
          <line x1="136" y1="112" x2="146" y2="204" />
        </g>

        <g className="feature-bag__sparkles">
          <path d="M34 150l16 2.5-16 2.5 2.5 16-2.5-16-16-2.5 16-2.5-2.5-16z" />
          <path d="M204 168l10 1.6-10 1.6 1.6 10-1.6-10-10-1.6 10-1.6-1.6-10z" />
          <circle cx="190" cy="126" r="6.5" />
        </g>
      </svg>
    </div>
  );
}
