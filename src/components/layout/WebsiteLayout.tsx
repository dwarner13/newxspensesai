import React from 'react';
import SimpleNavigation from './SimpleNavigation';
import Footer from './Footer';

const WebsiteLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <SimpleNavigation />
      <main className="flex-1"> {/* Removed pt-16 to eliminate gap */}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default WebsiteLayout; 
