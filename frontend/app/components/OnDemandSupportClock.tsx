type OnDemandSupportClockProps = {
  className?: string;
};

export function OnDemandSupportClock({
  className = "",
}: OnDemandSupportClockProps) {
  return (
    <div
      className={`feature-clock relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[360px] ${className}`}
      aria-hidden="true"
    >
      <div className="feature-clock__halo" />
      <div className="feature-clock__glow" />
      <svg
        viewBox="0 0 260 260"
        className="feature-clock__svg"
        role="presentation"
      >
        <defs>
          <radialGradient
            id="clockBodyGradient"
            cx="130"
            cy="130"
            r="120"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5cafc1" />
            <stop offset="0.55" stopColor="#ffebd3" />
            <stop offset="1" stopColor="#de5e48" />
          </radialGradient>
          <linearGradient
            id="clockRingGradient"
            x1="50"
            y1="50"
            x2="210"
            y2="210"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5cafc1" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#de5e48" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient
            id="clockHandGradient"
            x1="130"
            y1="60"
            x2="130"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5cafc1" />
            <stop offset="100%" stopColor="#ffebd3" />
          </linearGradient>
        </defs>

        <circle
          className="feature-clock__ring"
          cx="130"
          cy="130"
          r="110"
          fill="none"
          stroke="url(#clockRingGradient)"
          strokeWidth="8"
        />
        <circle
          className="feature-clock__face"
          cx="130"
          cy="130"
          r="94"
          fill="url(#clockBodyGradient)"
        />

        <g className="feature-clock__ticks">
          {Array.from({ length: 12 }).map((_, index) => {
            const angle = (index / 12) * Math.PI * 2;
            const innerRadius = 74;
            const outerRadius = 88;
            const precise = (value: number) => Number(value.toFixed(6));
            const x1 = precise(130 + innerRadius * Math.sin(angle));
            const y1 = precise(130 - innerRadius * Math.cos(angle));
            const x2 = precise(130 + outerRadius * Math.sin(angle));
            const y2 = precise(130 - outerRadius * Math.cos(angle));
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={`feature-clock__tick ${
                  index % 3 === 0 ? "feature-clock__tick--major" : ""
                }`}
              />
            );
          })}
        </g>

        <g className="feature-clock__hands">
          <line
            className="feature-clock__hand feature-clock__hand--hour"
            x1="130"
            y1="130"
            x2="130"
            y2="90"
          />
          <line
            className="feature-clock__hand feature-clock__hand--minute"
            x1="130"
            y1="130"
            x2="130"
            y2="66"
          />
          <circle
            className="feature-clock__hand-cap"
            cx="130"
            cy="130"
            r="8"
          />
        </g>

        <g className="feature-clock__blips">
          <circle cx="178" cy="114" r="6" />
          <circle cx="92" cy="162" r="5" />
          <circle cx="150" cy="184" r="4" />
        </g>

        <path
          className="feature-clock__trail feature-clock__trail--one"
          d="M166 92c16 10 24 26 22 42"
        />
        <path
          className="feature-clock__trail feature-clock__trail--two"
          d="M96 170c10 8 24 12 38 10"
        />
      </svg>
    </div>
  );
}
