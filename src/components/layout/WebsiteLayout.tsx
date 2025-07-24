import React from 'react';
import MainNavigation from './MainNavigation';
import Footer from './Footer';

const WebsiteLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      <main className="flex-1 pt-16"> {/* pt-16 to offset sticky nav height */}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default WebsiteLayout; 