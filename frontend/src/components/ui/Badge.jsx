import React from 'react';

export const Badge = ({ children, variant = 'primary', className = "" }) => {
  const variants = {
    primary: "bg-primary-500/10 text-primary-400 border-primary-500/20",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    neutral: "bg-dark-surface hover:bg-dark-border text-gray-300 border-white/10",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
