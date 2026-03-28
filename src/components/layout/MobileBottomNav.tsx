import React, { useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Receipt, Tags, Settings, Plus, X } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (!location.pathname.startsWith('/dashboard')) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Navigate to upload page — file will need to be added there
      navigate('/dashboard/upload');
    }
    e.target.value = '';
    setShowUploadMenu(false);
  };

  const tabs = [
    { icon: Home, label: "Home", to: "/dashboard" },
    { icon: Receipt, label: "Money", to: "/dashboard/transactions" },
    null, // center button placeholder
    { icon: Tags, label: "Categories", to: "/dashboard/categories" },
    { icon: Settings, label: "Settings", to: "/dashboard/settings" },
  ];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {/* Upload menu overlay */}
      {showUploadMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} onClick={() => setShowUploadMenu(false)} />
          <div style={{
            position: 'fixed', bottom: 80, left: 16, right: 16,
            background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 16,
            padding: 8, zIndex: 200, boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
          }}>
            {[
              { emoji: "\uD83D\uDCF7", title: "Take Photo", desc: "Open camera to snap a receipt", action: () => { cameraRef.current?.click(); } },
              { emoji: "\uD83D\uDDBC\uFE0F", title: "Choose from Gallery", desc: "Select an existing photo", action: () => { galleryRef.current?.click(); } },
              { emoji: "\uD83D\uDCC4", title: "Upload Statement", desc: "PDF, CSV, or image file", action: () => { setShowUploadMenu(false); navigate('/dashboard/upload'); } },
            ].map((opt, i) => (
              <button key={opt.title} onClick={opt.action} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '14px 16px', background: 'transparent', border: 'none', borderRadius: 10,
                borderBottom: i < 2 ? '1px solid rgba(30,45,74,0.5)' : 'none',
                color: '#e8ecf4', cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: '#9ba8bc', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <div data-mobile-bottom-nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#0b1220', borderTop: '1px solid #1e2d4a',
        paddingBottom: 'env(safe-area-inset-bottom)',
        fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', padding: '6px 4px' }}>
          {tabs.map((tab, i) => {
            if (!tab) {
              // Center upload button
              return (
                <button key="upload" onClick={() => setShowUploadMenu(!showUploadMenu)} style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: showUploadMenu ? '#1e2d4a' : 'linear-gradient(135deg, #c8a64e, #a08030)',
                  border: '3px solid #0b1220',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', top: -16, marginTop: -4,
                  boxShadow: showUploadMenu ? 'none' : '0 4px 20px rgba(200,166,78,0.4)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {showUploadMenu ? <X size={22} color="#e8ecf4" /> : <Plus size={22} color="#fff" />}
                </button>
              );
            }

            const isActive = tab.to === '/dashboard'
              ? location.pathname === '/dashboard' || location.pathname === '/dashboard/'
              : location.pathname.startsWith(tab.to);
            const Icon = tab.icon;

            return (
              <NavLink key={tab.to} to={tab.to} end={tab.to === '/dashboard'} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
                color: isActive ? '#c8a64e' : '#9ba8bc',
                transition: 'color 0.15s',
              }}>
                <Icon size={20} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </>
  );
}
