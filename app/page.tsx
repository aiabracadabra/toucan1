import { Suspense } from 'react';
import Dashboard from '@/components/Dashboard';

function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="h-7 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse mt-2"></div>
      </header>

      {/* Top bar skeleton */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-9 w-48 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-9 w-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Main content loading */}
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}
