import React from 'react';

export const Card = ({ children, className = "", noPadding = false }) => {
  return (
    <div className={`glass-panel rounded-2xl overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
