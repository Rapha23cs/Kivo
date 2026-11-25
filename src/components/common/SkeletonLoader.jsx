import React from 'react';

export function ModuleLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-56 rounded-lg kivo-skeleton" />
          <div className="h-3.5 w-80 max-w-full rounded kivo-skeleton" />
        </div>
        <div className="h-9 w-36 rounded-lg kivo-skeleton" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="kivo-card rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="h-3 w-24 rounded kivo-skeleton" />
            <div className="h-7 w-16 rounded kivo-skeleton" />
            <div className="h-2.5 w-32 rounded kivo-skeleton" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((n) => (
          <div key={n} className="kivo-card rounded-2xl p-5 space-y-3">
            <div className="h-4 w-44 rounded kivo-skeleton" />
            <div className="h-36 rounded-xl kivo-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex font-sans">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex w-64 bg-[#111214] border-r border-[#1F2024] p-4 flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg kivo-skeleton" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-20 rounded kivo-skeleton" />
              <div className="h-2.5 w-28 rounded kivo-skeleton" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-9 rounded-lg kivo-skeleton" />
            ))}
          </div>
        </div>
        <div className="h-16 rounded-xl kivo-skeleton" />
      </aside>

      {/* Main Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-[#1F2024] bg-[#0D0E10] px-4 sm:px-6 flex items-center justify-between">
          <div className="h-8 w-44 rounded-lg kivo-skeleton" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 rounded-lg hidden sm:block kivo-skeleton" />
            <div className="h-8 w-8 rounded-full kivo-skeleton" />
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ModuleLoadingSkeleton />
        </div>
      </div>
    </div>
  );
}
