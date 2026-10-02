'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium animate-pulse">Loading DHDC Portal...</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
