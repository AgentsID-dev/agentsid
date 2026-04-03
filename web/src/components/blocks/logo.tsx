const AgentsIDLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg
    viewBox="0 0 40 40"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <rect x="6" y="4" width="28" height="8" rx="3" fill="url(#logoGrad)" opacity="0.3" />
    <rect x="4" y="14" width="32" height="8" rx="3" fill="url(#logoGrad)" opacity="0.6" />
    <rect x="2" y="24" width="36" height="8" rx="3" fill="url(#logoGrad)" />
    <rect x="14" y="33" width="12" height="4" rx="2" fill="url(#logoGrad)" opacity="0.8" />
  </svg>
);

export { AgentsIDLogo };
