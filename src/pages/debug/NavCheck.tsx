/**
 * Debug route to test mobile navigation in isolation
 * Access at /debug/navcheck
 */

import React from 'react';
import MobileNav from '../../components/navigation/MobileNav';
import NAV_ITEMS from '../../navigation/nav-registry';

export default function NavCheck() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mobile Navigation Debug</h1>
        
        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Mobile Navigation Test</h2>
            <p className="text-zinc-300 mb-4">
              This page tests the mobile navigation component in isolation.
              The hamburger menu should appear below and open a side drawer.
            </p>
            
            {/* Mobile Navigation Component */}
            <div className="border border-zinc-700 p-4 rounded-lg">
              <MobileNav />
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">NAV_ITEMS Data</h2>
            <div className="text-sm text-zinc-300">
              <p>Total items: {NAV_ITEMS.length}</p>
              <div className="mt-4 space-y-2">
                {NAV_ITEMS.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    <span className="text-zinc-500">({item.group})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Debug Instructions</h2>
            <ol className="text-zinc-300 space-y-2 text-sm">
              <li>1. Resize browser to mobile width (&lt; 768px)</li>
              <li>2. Click the hamburger menu button</li>
              <li>3. Verify the side drawer opens</li>
              <li>4. Click any navigation item</li>
              <li>5. Verify navigation works and drawer closes</li>
              <li>6. Check console for debug logs</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}