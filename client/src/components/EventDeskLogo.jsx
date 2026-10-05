import React from 'react';

/**
 * EventDeskIcon: Vector SVG of the official EventDesk 'E' logo
 * 100% transparent background so it seamlessly matches the website background in both light and dark modes.
 */
export function EventDeskIcon({ className = 'w-8 h-8', ...props }) {
  return (
    <svg
      viewBox="0 0 880 760"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Left vertical pill */}
      <rect x="4" y="4" width="162" height="750" rx="81" fill="#3B49DF" />
      {/* Top horizontal pill */}
      <rect x="239" y="4" width="583" height="179" rx="89.5" fill="#3B49DF" />
      {/* Middle horizontal pill */}
      <rect x="239" y="293" width="393" height="180" rx="90" fill="#20B2AA" />
      {/* Middle right dot */}
      <circle cx="785" cy="383" r="91" fill="#20B2AA" />
      {/* Bottom horizontal pill */}
      <rect x="239" y="576" width="524" height="178" rx="89" fill="#FBBF24" />
    </svg>
  );
}

/**
 * EventDeskLogo: Complete brand logo with icon and typography
 * Perfectly matches light/dark website backgrounds with zero background artifacts.
 */
export default function EventDeskLogo({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showText = true,
  showSubtitle = true,
  className = '',
  iconClassName = '',
}) {
  const sizeMap = {
    sm: {
      icon: 'w-6 h-6',
      text: 'text-base',
      sub: 'text-[7px]',
    },
    md: {
      icon: 'w-8 h-8',
      text: 'text-xl',
      sub: 'text-[8px]',
    },
    lg: {
      icon: 'w-10 h-10',
      text: 'text-2xl',
      sub: 'text-[9px]',
    },
    xl: {
      icon: 'w-14 h-14',
      text: 'text-3xl',
      sub: 'text-[10px]',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      <EventDeskIcon className={`${currentSize.icon} ${iconClassName}`} />

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center tracking-tight">
            <span className={`font-black text-slate-900 dark:text-white ${currentSize.text}`}>
              Event
            </span>
            <span className={`font-black text-blue-600 dark:text-blue-400 ${currentSize.text}`}>
              Desk
            </span>
          </div>

          {showSubtitle && (
            <span
              className={`font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-400 ${currentSize.sub} mt-1`}
            >
              Smart Event Coordination
            </span>
          )}
        </div>
      )}
    </div>
  );
}
