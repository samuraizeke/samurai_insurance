type RenewalGuardShieldProps = {
  className?: string;
};

export function RenewalGuardShield({ className = "" }: RenewalGuardShieldProps) {
  return (
    <div
      className={`feature-shield relative mx-auto aspect-[1/1.1] w-full max-w-[320px] sm:max-w-[360px] ${className}`}
      aria-hidden="true"
    >
      <div className="feature-shield__halo" />
      <div className="feature-shield__glow" />
      <svg
        viewBox="0 0 200 240"
        className="feature-shield__svg"
        role="presentation"
      >
        <defs>
          <linearGradient
            id="shieldGradient"
            x1="36"
            y1="34"
            x2="178"
            y2="226"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5cafc1" />
            <stop offset="0.55" stopColor="#ffebd3" />
            <stop offset="1" stopColor="#de5e48" />
          </linearGradient>
          <linearGradient
            id="shieldSideGradient"
            x1="44"
            y1="44"
            x2="104"
            y2="184"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#f7f6f3" />
            <stop offset="0.45" stopColor="#5cafc1" stopOpacity="0.85" />
            <stop offset="1" stopColor="#333333" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient
            id="shieldSideGradientRight"
            x1="96"
            y1="44"
            x2="156"
            y2="184"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ffebd3" />
            <stop offset="0.5" stopColor="#de5e48" stopOpacity="0.95" />
            <stop offset="1" stopColor="#5cafc1" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient
            id="shieldGloss"
            x1="60"
            y1="36"
            x2="140"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#f7f6f3" stopOpacity="0.88" />
            <stop offset="0.45" stopColor="#ffebd3" stopOpacity="0.58" />
            <stop offset="1" stopColor="#ffebd3" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon
          className="feature-shield__piece feature-shield__piece--base"
          points="100,8 178,58 152,188 100,230 48,188 22,58"
          fill="url(#shieldGradient)"
        />
        <polygon
          className="feature-shield__piece feature-shield__piece--left"
          points="54,78 96,44 92,176 64,156"
          fill="url(#shieldSideGradient)"
        />
        <polygon
          className="feature-shield__piece feature-shield__piece--right"
          points="108,44 150,78 136,156 108,176"
          fill="url(#shieldSideGradientRight)"
        />
        <path
          className="feature-shield__piece feature-shield__piece--top"
          d="M100 8 178 58 100 96 22 58Z"
          fill="url(#shieldGloss)"
        />
        <path
          className="feature-shield__piece feature-shield__piece--centerline"
          d="M100 20V208"
          stroke="#f7f6f3"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          className="feature-shield__outline"
          d="M100 8 178 58 152 188 100 230 48 188 22 58Z"
        />
        <circle
          className="feature-shield__particle feature-shield__particle--a"
          cx="58"
          cy="108"
          r="6"
        />
        <circle
          className="feature-shield__particle feature-shield__particle--b"
          cx="144"
          cy="132"
          r="5"
        />
        <circle
          className="feature-shield__particle feature-shield__particle--c"
          cx="90"
          cy="188"
          r="4"
        />
      </svg>
    </div>
  );
}
