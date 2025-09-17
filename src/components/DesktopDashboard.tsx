import React from 'react';

interface DesktopDashboardProps {
  children?: React.ReactNode;
}

export default function DesktopDashboard({ children }: DesktopDashboardProps) {
  return (
    <div className="desktop-only min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {children}
    </div>
  );
}





