'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700/60 rounded-lg ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-44" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-4 ${cIdx === 0 ? 'w-1/4' : cIdx === 1 ? 'w-1/3' : 'w-1/6'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="h-56 flex items-end justify-between gap-3 pt-6">
        <Skeleton className="h-2/3 flex-1 rounded-t-md" />
        <Skeleton className="h-full flex-1 rounded-t-md" />
        <Skeleton className="h-1/2 flex-1 rounded-t-md" />
        <Skeleton className="h-3/4 flex-1 rounded-t-md" />
        <Skeleton className="h-2/5 flex-1 rounded-t-md" />
      </div>
    </div>
  );
}
