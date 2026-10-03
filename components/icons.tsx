// Small inline icons (no icon library → smaller download on slow networks).
type P = { size?: number };
const s = (size = 24) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const IconShield = ({ size }: P) => (<svg {...s(size)}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>);
export const IconHome = ({ size }: P) => (<svg {...s(size)}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>);
export const IconHistory = ({ size }: P) => (<svg {...s(size)}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>);
export const IconBook = ({ size }: P) => (<svg {...s(size)}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" /><path d="M8 7h7" /></svg>);
export const IconUser = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-5 8-5s6.5 1 8 5" /></svg>);
export const IconPlus = ({ size }: P) => (<svg {...s(size)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconCamera = ({ size }: P) => (<svg {...s(size)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>);
export const IconMic = ({ size }: P) => (<svg {...s(size)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);
export const IconSpeaker = ({ size }: P) => (<svg {...s(size)}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></svg>);
export const IconShare = ({ size }: P) => (<svg {...s(size)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>);
export const IconClock = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconPen = ({ size }: P) => (<svg {...s(size)}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>);
export const IconYoutube = ({ size }: P) => (<svg {...s(size)}><rect x="3" y="6" width="18" height="12" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></svg>);
export const IconChat = ({ size }: P) => (<svg {...s(size)}><path d="M4 20l1.5-4A8 8 0 1 1 9 19.5L4 20z" /></svg>);
export const IconSend = ({ size }: P) => (<svg {...s(size)}><path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" /></svg>);
export const IconInsta = ({ size }: P) => (<svg {...s(size)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>);
export const IconUsers = ({ size }: P) => (<svg {...s(size)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.2 0 3.8 1.2 4.5 4" /></svg>);
export const IconNews = ({ size }: P) => (<svg {...s(size)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></svg>);
export const IconStar = ({ size }: P) => (<svg {...s(size)}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>);
export const IconPhone = ({ size }: P) => (<svg {...s(size)}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>);
export const IconDots = ({ size }: P) => (<svg {...s(size)}><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></svg>);
export const IconExternal = ({ size }: P) => (<svg {...s(size)}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>);
export const IconHelp = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" /></svg>);
