import React from 'react';

interface MobileDebugData {
  path: string;
  width: number;
  isMobile: boolean;
  isMobileByWidth: boolean;
  isLikelyMobileUA: boolean;
  isExcludedRoute: boolean;
  shouldRenderMobile: boolean;
  currentView?: string;
}

interface MobileDebugPanelProps {
  data: MobileDebugData;
}

export default function MobileDebugPanel({ data }: MobileDebugPanelProps) {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const enabled = import.meta.env.VITE_MOBILE_DEBUG === 'true' || (search?.get('debugMobile') === '1');
  
  if (!enabled) return null;

  const getStatusColor = (value: boolean) => value ? 'text-green-400' : 'text-red-400';
  const getStatusIcon = (value: boolean) => value ? '✅' : '❌';

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 12, 
        right: 12, 
        zIndex: 9999,
        maxWidth: '300px'
      }} 
      className="rounded-xl bg-black/90 text-white text-xs p-3 shadow-xl border border-white/20"
    >
      <div className="font-bold text-sm mb-2 flex items-center gap-2">
        🔍 Mobile Debug Panel
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Path:</span>
          <span className="font-mono text-blue-300">{data.path}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Width:</span>
          <span className="font-mono">{data.width}px</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span>isMobile:</span>
          <span className={`font-mono ${getStatusColor(data.isMobile)}`}>
            {getStatusIcon(data.isMobile)} {String(data.isMobile)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span>isMobileByWidth:</span>
          <span className={`font-mono ${getStatusColor(data.isMobileByWidth)}`}>
            {getStatusIcon(data.isMobileByWidth)} {String(data.isMobileByWidth)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span>isLikelyMobileUA:</span>
          <span className={`font-mono ${getStatusColor(data.isLikelyMobileUA)}`}>
            {getStatusIcon(data.isLikelyMobileUA)} {String(data.isLikelyMobileUA)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span>isExcludedRoute:</span>
          <span className={`font-mono ${getStatusColor(data.isExcludedRoute)}`}>
            {getStatusIcon(data.isExcludedRoute)} {String(data.isExcludedRoute)}
          </span>
        </div>
        
        <div className="flex justify-between items-center border-t border-white/20 pt-1">
          <span className="font-bold">shouldRenderMobile:</span>
          <span className={`font-mono font-bold ${getStatusColor(data.shouldRenderMobile)}`}>
            {getStatusIcon(data.shouldRenderMobile)} {String(data.shouldRenderMobile)}
          </span>
        </div>
        
        {data.currentView && (
          <div className="flex justify-between">
            <span>currentView:</span>
            <span className="font-mono text-yellow-300">{data.currentView}</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Add ?debugMobile=1 to URL to enable
      </div>
      
      {/* Why Not Badges */}
      <div style={{marginTop:4}}>
        {!data.shouldRenderMobile && (
          <div className="mt-2 text-[11px]">
            <span className="mr-2 rounded bg-red-600/60 px-2 py-0.5">Mobile blocked</span>
            {!data.isMobileByWidth && <span className="mr-2 rounded bg-zinc-700 px-2 py-0.5">width ≥ 768</span>}
            {data.isExcludedRoute && <span className="mr-2 rounded bg-zinc-700 px-2 py-0.5">route excluded</span>}
          </div>
        )}
      </div>
    </div>
  );
}
