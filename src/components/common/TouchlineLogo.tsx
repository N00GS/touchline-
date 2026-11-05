import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  subtitle?: string;
}

/**
 * Approved Touchline Coach Logo:
 * Black-and-white "C" and football logo, where the football is formed
 * by the negative space inside the C.
 */
export const TouchlineLogo: React.FC<LogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  subtitle,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
        aria-label="Touchline Coach Logo"
      >
        {/* Background rounded badge */}
        <rect width="100" height="100" rx="22" className="fill-black dark:fill-white transition-colors" />

        {/* Outer stylized 'C' path */}
        <path
          d="M78 22 A38 38 0 1 0 78 78 L64 64 A20 20 0 1 1 64 36 Z"
          className="fill-white dark:fill-black transition-colors"
        />

        {/* Football nested inside the negative space opening of the C */}
        <g transform="translate(50, 50)">
          {/* Football ball base */}
          <circle cx="0" cy="0" r="14.5" className="fill-white dark:fill-black stroke-black dark:stroke-white transition-colors" strokeWidth="2.5" />
          {/* Central pentagon */}
          <polygon
            points="0,-5 4.75,-1.5 2.9,4.2 -2.9,4.2 -4.75,-1.5"
            className="fill-black dark:fill-white transition-colors"
          />
          {/* Seam lines to outer circle */}
          <line x1="0" y1="-5" x2="0" y2="-14.5" className="stroke-black dark:stroke-white transition-colors" strokeWidth="2" />
          <line x1="4.75" y1="-1.5" x2="13.8" y2="-4.5" className="stroke-black dark:stroke-white transition-colors" strokeWidth="2" />
          <line x1="2.9" y1="4.2" x2="8.5" y2="12" className="stroke-black dark:stroke-white transition-colors" strokeWidth="2" />
          <line x1="-2.9" y1="4.2" x2="-8.5" y2="12" className="stroke-black dark:stroke-white transition-colors" strokeWidth="2" />
          <line x1="-4.75" y1="-1.5" x2="-13.8" y2="-4.5" className="stroke-black dark:stroke-white transition-colors" strokeWidth="2" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-black tracking-wider text-base uppercase text-black dark:text-white">
            Touchline
          </span>
          <span className="font-semibold text-xs tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
            {subtitle || 'Coach'}
          </span>
        </div>
      )}
    </div>
  );
};
