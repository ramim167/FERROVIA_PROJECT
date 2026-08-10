const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
export function Icon({name,size=20,className=''}){
 const p={...base,width:size,height:size,className}
 const icons={
  home:<><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  ticket:<><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z"/><path d="M13 5v2M13 11v2M13 17v2"/></>,
  support:<><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-.9.6-1.4 1.1-1.4 2.1"/><path d="M12 17h.01"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  mapPin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  swap:<><path d="M7 7h11l-3-3M17 17H6l3 3"/></>,
  arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
  train:<><rect x="5" y="3" width="14" height="14" rx="4"/><path d="M8 7h8M8 11h8M8 17l-2 4M16 17l2 4M8 21h8"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  star:<><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></>,
  chevron:<><path d="m9 18 6-6-6-6"/></>,
  shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  lightning:<><path d="m13 2-9 12h7l-1 8 9-12h-7Z"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  heart:<><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.3l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></>,
  filter:<><path d="M4 6h16M7 12h10M10 18h4"/></>,
  chart:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  print:<><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></>,
  download:<><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
  close:<><path d="M18 6 6 18M6 6l12 12"/></>,
  logout:<><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/></>,
  menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
  eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  trash:<><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
  check:<><path d="m5 12 4 4L19 6"/></>,
  facebook:<><path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.7.3-1 1-1Z" fill="currentColor" stroke="none"/></>,
  linkedin:<><rect x="4" y="9" width="4" height="11" rx="1" fill="currentColor" stroke="none"/><circle cx="6" cy="5.5" r="2" fill="currentColor" stroke="none"/><path d="M11 20V9h4v1.7c1-1.3 2.3-2.1 4.1-2.1 3 0 4.9 2 4.9 6V20h-4v-4.8c0-1.9-.7-3-2.3-3-1.7 0-2.7 1.1-2.7 3.3V20h-4Z" transform="translate(-1)" fill="currentColor" stroke="none"/></>,
  instagram:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,
 }
 return <svg {...p}>{icons[name]||icons.info}</svg>
}
