/**
 * @deprecated Use src/components/navigation/MobileNav instead
 * This component is deprecated and will be removed in a future version.
 * The new MobileNav uses NAV_ITEMS from nav-registry.tsx as single source of truth.
 */
console.warn("[DEPRECATED] Using old mobile nav. Replace with MobileNav.");

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import Logo from '../common/Logo';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function MobileSidebar({ open, onClose, children }: MobileSidebarProps) {
  const location = useLocation();
  
  console.log('🔍 MobileSidebar render:', { open, children: !!children, childrenType: typeof children });
  
  // Only show sidebar on dashboard routes
  if (!location.pathname.startsWith('/dashboard')) {
    return null;
  }
  
  // Show sidebar ONLY on dashboard routes
  // Continue with sidebar rendering

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Removed early return to allow sidebar to render with transform

  // Simple test - render directly without portal
  if (!open) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 99999,
      display: 'flex'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '300px',
        backgroundColor: '#0b0f2a',
        border: '5px solid red',
        padding: '20px',
        color: 'white',
        fontSize: '18px'
      }}>
        <div style={{ marginBottom: '20px', background: 'yellow', color: 'black', padding: '10px' }}>
          SIDEBAR IS WORKING! State: {open ? 'TRUE' : 'FALSE'}
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h3>Main Dashboard</h3>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h3>AI WORKSPACE</h3>
          <div>Smart Import AI</div>
          <div>AI Chat Assistant</div>
          <div>Smart Categories</div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h3>PLANNING & ANALYSIS</h3>
          <div>Financial Reports</div>
          <div>Budget Planning</div>
          <div>Analytics</div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'red',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          CLOSE SIDEBAR
        </button>
      </div>
    </div>
  );
}
