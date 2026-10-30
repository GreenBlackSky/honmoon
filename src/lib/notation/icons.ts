/* The small line icons used on drill and family cards. */
export const IC ={
  dot:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 5h18M1 10h18M1 15h18"/><path d="M6.5 2v16" stroke-width="2.2"/><circle cx="13" cy="10" r="3.1" fill="currentColor" stroke="none"/></svg>',
  target:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="10" r="7.4"/><circle cx="10" cy="10" r="2.6" fill="currentColor" stroke="none"/><path d="M10 0v3.2M10 16.8V20M0 10h3.2M16.8 10H20"/></svg>',
  staff:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 4h20M0 8h20M0 12h20M0 16h20"/><ellipse cx="7" cy="14" rx="3.4" ry="2.5" fill="currentColor" stroke="none" transform="rotate(-18 7 14)"/><path d="M10.2 13.4V3.6" stroke-width="1.6"/></svg>',
  wave:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M2 8.5v3M6 4.5v11M10 1.5v17M14 5.5v9M18 8.5v3"/></svg>',
  swap:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h14M12.5 3l3.5 3.5-3.5 3.5M18 13.5H4M7.5 10 4 13.5 7.5 17"/></svg>',
  voice:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4.5 8v4M8 4.5v11"/><path d="M12 6.6a4.6 4.6 0 0 1 0 6.8M15.4 4a9 9 0 0 1 0 12"/></svg>',
  book:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M10 4.6C8.4 3.2 5.9 2.8 3 3.2v12.2c2.9-.4 5.4 0 7 1.4 1.6-1.4 4.1-1.8 7-1.4V3.2c-2.9-.4-5.4 0-7 1.4Z"/><path d="M10 4.6v12.2"/></svg>'
} as const;

export type IconName = keyof typeof IC;
