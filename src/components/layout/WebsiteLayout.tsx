// LEGACY: Deprecated WebsiteLayout – now only passes children.
// Do not use for new pages. Use MarketingLayout instead.
import React from 'react';

const WebsiteLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default WebsiteLayout; 
