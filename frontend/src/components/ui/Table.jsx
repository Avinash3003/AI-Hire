import React from 'react';

export const Table = ({ headers, children }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-white/5 bg-dark-surface/30">
          {headers.map((header, index) => (
            <th key={index} className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {children}
      </tbody>
    </table>
  </div>
);

export const TableRow = ({ children, className = "" }) => (
  <tr className={`hover:bg-dark-surface/50 transition-colors ${className}`}>
    {children}
  </tr>
);

export const TableCell = ({ children, className = "" }) => (
  <td className={`py-4 px-6 text-sm text-gray-300 ${className}`}>
    {children}
  </td>
);
