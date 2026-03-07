"use client";

const WIND_PATHS = [
  "M -50 95 C 200 60, 400 135, 600 110 S 900 65, 1100 100 S 1400 140, 1600 95 S 1800 60, 1970 90",
  "M -50 170 C 200 135, 400 192, 600 150 S 900 115, 1100 160 S 1400 192, 1600 160 S 1800 120, 1970 155",
  "M -50 140 C 250 180, 450 90, 650 130 S 950 180, 1150 125 S 1350 80, 1550 135 S 1750 180, 1970 125",
];

function LeafOnPath({
  pathId,
  size,
  dur,
  delay,
  rotationOffset = 0,
}: {
  pathId: string;
  size: number;
  dur: number;
  delay: number;
  rotationOffset?: number;
}) {
  const half = size / 2;
  return (
    <g
      transform={rotationOffset ? `rotate(${rotationOffset})` : undefined}
      visibility="hidden"
    >
      <animate
        attributeName="visibility"
        from="hidden"
        to="visible"
        begin={`${delay}s`}
        dur="0.001s"
        fill="freeze"
      />
      <animateMotion
        dur={`${dur}s`}
        repeatCount="indefinite"
        rotate="auto"
        keyPoints="0;1"
        keyTimes="0;1"
        calcMode="linear"
        begin={`${delay}s`}
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <image
        href="/leaf.png"
        x={-half}
        y={-half}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        opacity={0.9}
      />
    </g>
  );
}

export default function WindGust() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none overflow-hidden"
      aria-hidden
    >
      <svg
        viewBox="-50 0 2020 192"
        className="w-full h-full"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <filter id="wind-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.04"
              numOctaves="3"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.015 0.04;0.018 0.045;0.012 0.038;0.015 0.04"
                dur="18s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="0.8"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <path id="wind-path-1" d={WIND_PATHS[0]} fill="none" />
          <path id="wind-path-2" d={WIND_PATHS[1]} fill="none" />
          <path id="wind-path-3" d={WIND_PATHS[2]} fill="none" />
        </defs>

        {/* Wind lines - solid, bending/shifting via SVG filter */}
        <g filter="url(#wind-wobble)">
          <path
            className="wind-line wind-line-1"
            d={WIND_PATHS[0]}
            fill="none"
            stroke="rgba(127, 175, 143, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className="wind-line wind-line-2"
            d={WIND_PATHS[1]}
            fill="none"
            stroke="rgba(127, 175, 143, 0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            className="wind-line wind-line-3"
            d={WIND_PATHS[2]}
            fill="none"
            stroke="rgba(127, 175, 143, 0.38)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* Leaves follow paths using SVG animateMotion - precise path following */}
        {[
          { size: 22, delay: 0, dur: 25, path: 0, rotationOffset: 80 },
          { size: 20, delay: 15, dur: 25, path: 1, rotationOffset: -95 },
          { size: 18, delay: 30, dur: 25, path: 2, rotationOffset: 105 },
        ].map((l, i) => (
          <LeafOnPath
            key={i}
            pathId={`wind-path-${l.path + 1}`}
            size={l.size}
            dur={l.dur}
            delay={l.delay}
            rotationOffset={l.rotationOffset}
          />
        ))}
      </svg>
    </div>
  );
}
