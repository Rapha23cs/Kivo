import React from 'react';

export function AppLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex font-sans animate-pulse">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex w-64 bg-[#111214] border-r border-[#1F2024] p-4 flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-[#1E2025]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-20 bg-[#1E2025] rounded" />
              <div className="h-2.5 w-28 bg-[#18191D] rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-9 bg-[#16171B] rounded-lg" />
            ))}
          </div>
        </div>
        <div className="h-16 bg-[#16171B] rounded-xl" />
      </aside>

      {/* Main Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-[#1F2024] bg-[#0D0E10] px-4 sm:px-6 flex items-center justify-between">
          <div className="h-8 w-44 bg-[#16171B] rounded-lg" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-[#16171B] rounded-lg hidden sm:block" />
            <div className="h-8 w-8 bg-[#1E2025] rounded-full" />
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="h-32 bg-[#141518] border border-[#232429] rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 bg-[#141518] border border-[#232429] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56 bg-[#141518] border border-[#232429] rounded-xl" />
            <div className="h-56 bg-[#141518] border border-[#232429] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
