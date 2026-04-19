import React from 'react';

export const Input = ({ label, icon: Icon, error, required, className = "", ...props }) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-300">{label} {required && <span className="text-red-500">*</span>}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />}
      <input 
        className={`w-full bg-dark-bg/50 border rounded-xl py-2.5 ${Icon ? 'pl-10' : 'pl-4'} pr-4 outline-none transition-colors text-white ${
          error ? 'border-red-500 focus:border-red-500' : 'border-dark-border focus:border-primary-500'
        }`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

export const Select = ({ label, icon: Icon, options = [], error, required, className = "", ...props }) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-300">{label} {required && <span className="text-red-500">*</span>}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" size={18} />}
      <select 
        className={`w-full bg-dark-bg/50 border rounded-xl py-2.5 ${Icon ? 'pl-10' : 'pl-4'} pr-10 outline-none transition-colors text-white appearance-none ${
          error ? 'border-red-500 focus:border-red-500' : 'border-dark-border focus:border-primary-500'
        }`}
        {...props}
      >
        <option value="" disabled className="bg-dark-surface text-gray-400">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-dark-surface text-white">{opt.label}</option>
        ))}
      </select>
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);
