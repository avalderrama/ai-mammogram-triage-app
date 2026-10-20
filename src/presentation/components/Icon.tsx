/** Single line-icon set (24 px grid, 2 px stroke; UX-VIS-016). Decorative unless a label is given. */
const PATHS = {
  alert: 'M12 3 2 21h20L12 3Zm0 6v5m0 3.5v.5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  check: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4.5-10 3 3 6-6',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  image: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm-1 13 5-5 4 4 3-3 6 6M15.5 9.5h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-9.5v.5',
  error: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3.5-13.5 7 7m0-7-7 7',
  offline: 'M2 8.5a15 15 0 0 1 4.5-2.8M22 8.5A15 15 0 0 0 11 4.6M5.5 12a10 10 0 0 1 3-1.8M18.5 12a10 10 0 0 0-2.4-1.6M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2.1-1.6-2-3.4-2.5 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.6a7.5 7.5 0 0 0-2.2 1.3l-2.5-1-2 3.4 2.1 1.6a7.4 7.4 0 0 0 0 2.6l-2.1 1.6 2 3.4 2.5-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.2-1.3l2.5 1 2-3.4-2.1-1.6c.1-.4.1-.9.1-1.3Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, label, size = 'md', className }:
  { name: IconName; label?: string; size?: 'md' | 'lg'; className?: string }) {
  return (
    <svg className={`icon icon--${size}${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
