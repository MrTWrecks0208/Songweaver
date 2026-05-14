import React from 'react';

export const PricingPlansIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left Card */}
    <rect x="5" y="18" width="28" height="66" rx="4" />
    <path d="M19 28v12M15 32c0-3 8-3 8 0s-8 6-8 9 8 3 8 0" strokeWidth="2.5" />
    <path d="M12 50h14M12 58h14M12 66h14" strokeWidth="2.5" />
    
    {/* Right Card */}
    <rect x="67" y="18" width="28" height="66" rx="4" />
    <path d="M81 28v12M77 32c0-3 8-3 8 0s-8 6-8 9 8 3 8 0" strokeWidth="2.5" />
    <path d="M74 50h14M74 58h14M74 66h14" strokeWidth="2.5" />
    
    {/* Middle Card (Slightly larger and in front) */}
    <rect x="32" y="5" width="36" height="90" rx="6" fill="#0f102e" strokeWidth="4" />
    <path d="M50 18v16M45 23c0-4 10-4 10 0s-10 8-10 12 10 4 10 0" strokeWidth="3" />
    <path d="M42 45h16M42 55h16M42 65h16" strokeWidth="3" />
    <rect x="44" y="78" width="12" height="6" rx="3" strokeWidth="3" />
  </svg>
);
