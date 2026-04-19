import React from 'react';

export const Skeleton = ({ className = "" }) => {
  return (
    <div className={`animate-pulse bg-dark-border rounded-md ${className}`}></div>
  );
};

export const CardSkeleton = () => (
  <div className="glass-panel p-6 rounded-xl space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <div className="pt-4 flex justify-between">
      <Skeleton className="h-8 w-24 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
);
