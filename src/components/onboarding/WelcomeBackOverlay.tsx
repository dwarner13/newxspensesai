/**
 * Welcome Back Overlay
 * 
 * Premium full-screen overlay shown after successful login/session restore.
 * Appears once per session and offers quick actions to continue.
 * 
 * Styled with premium glassmorphism, gradients, glow, and aurora effects
 * to match XspensesAI dashboard visual language.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, MessageCircle, Settings, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';

interface WelcomeBackOverlayProps {
  onDismiss?: () => void;
}

interface ActiveImport {
  id: string;
  documentId: string | null;
  fileName: string;
  status: string;
}

/**
 * Formats a name string to Title Case
 * Handles hyphens and apostrophes correctly (e.g., "o'neill" -> "O'Neill", "anne-marie" -> "Anne-Marie")
 */
function formatNameToTitleCase(name: string | null | undefined): string {
  if (!name) return 'there';
  
  const trimmed = name.trim();
  if (!trimmed) return 'there';
  
  // Split by spaces, hyphens, and apostrophes, then capitalize each part
  return trimmed
    .split(/([\s\-']+)/)
    .map((part, index) => {
      // If it's a separator (space, hyphen, apostrophe), keep it as-is
      if (/^[\s\-']+$/.test(part)) {
        return part;
      }
      // Otherwise, capitalize first letter, lowercase the rest
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

export function WelcomeBackOverlay({ onDismiss }: WelcomeBackOverlayProps) {
  const { user, userId, profile, firstName } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeImport, setActiveImport] = useState<ActiveImport | null>(null);
  const [loadingImport, setLoadingImport] = useState(true);
  const [hasPulsed, setHasPulsed] = useState(false);

  // Check if overlay should be shown
  useEffect(() => {
    const storageKey = 'xai_welcome_back_shown';
    const shown = sessionStorage.getItem(storageKey);
    
    // Show if not shown in this session AND user is authenticated AND onboarding completed
    if (!shown && user && userId && profile?.onboarding_completed) {
      setIsVisible(true);
      setIsAnimating(true);
      // Trigger pulse animation after modal opens
      setTimeout(() => {
        setHasPulsed(true);
        // Stop pulse after 1.2s
        setTimeout(() => {
          setHasPulsed(false);
        }, 1200);
      }, 100);
    }
  }, [user, userId, profile?.onboarding_completed]);

  // Fetch active import/document
  useEffect(() => {
    if (!userId || !isVisible) return;

    const fetchActiveImport = async () => {
      try {
        setLoadingImport(true);
        
        // First check user_documents for queued/processing status
        const { data: documents, error: docError } = await supabase
          .from('user_documents')
          .select('id, original_name, status')
          .eq('user_id', userId)
          .in('status', ['pending', 'queued', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (docError) {
          console.warn('[WelcomeBackOverlay] Error fetching documents:', docError);
        }

        if (documents) {
          setActiveImport({
            id: documents.id,
            documentId: documents.id,
            fileName: documents.original_name || 'Document',
            status: documents.status,
          });
          setLoadingImport(false);
          return;
        }

        // If no document, check imports table
        const { data: imports, error: importError } = await supabase
          .from('imports')
          .select('id, document_id, file_url, status')
          .eq('user_id', userId)
          .in('status', ['pending', 'parsing', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (importError) {
          console.warn('[WelcomeBackOverlay] Error fetching imports:', importError);
        }

        if (imports) {
          const fileName = imports.file_url?.split('/').pop() || 'Import';
          setActiveImport({
            id: imports.id,
            documentId: imports.document_id,
            fileName,
            status: imports.status,
          });
        }
      } catch (error) {
        console.error('[WelcomeBackOverlay] Error fetching active import:', error);
      } finally {
        setLoadingImport(false);
      }
    };

    fetchActiveImport();
  }, [userId, isVisible]);

  // Handle ESC key
  useEffect(() => {
    if (!isVisible) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          sessionStorage.setItem('xai_welcome_back_shown', 'true');
          onDismiss?.();
        }, 200);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isVisible, onDismiss]);

  // Scroll lock: Prevent body scroll when overlay is visible
  // Only toggle overflow, do NOT add padding or change widths
  useEffect(() => {
    if (!isVisible) return;

    // Store original overflow value
    const prev = document.body.style.overflow;
    
    // Lock scroll - ONLY change overflow, nothing else
    document.body.style.overflow = 'hidden';
    
    // Dev-only debug logging
    if (import.meta.env.DEV) {
      console.debug('[WelcomeBackOverlay] open', {
        bodyOverflow: getComputedStyle(document.body).overflow,
        bodyPaddingRight: getComputedStyle(document.body).paddingRight,
        bodyWidth: getComputedStyle(document.body).width,
        bodyMarginRight: getComputedStyle(document.body).marginRight,
      });
    }
    
    // Cleanup: Restore original overflow on unmount/close
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isVisible]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('xai_welcome_back_shown', 'true');
      onDismiss?.();
    }, 200);
  };

  const handleContinue = () => {
    handleDismiss();
    navigate('/dashboard');
  };

  const handlePrimeChat = () => {
    handleDismiss();
    navigate('/dashboard/prime-chat');
  };

  const handleResumeImport = () => {
    if (!activeImport) return;
    handleDismiss();
    
    // Navigate to Smart Import with document/import selected
    if (activeImport.documentId) {
      navigate(`/dashboard/smart-import-ai?documentId=${activeImport.documentId}`);
    } else {
      navigate(`/dashboard/smart-import-ai?importId=${activeImport.id}`);
    }
  };

  const handleSettings = () => {
    handleDismiss();
    navigate('/dashboard/settings');
  };

  // Get display name with priority: first_name > display_name > account_name > "there"
  const rawName = profile?.first_name || 
                  profile?.display_name?.split(' ')[0] || 
                  profile?.account_name || 
                  firstName || 
                  (user?.email ? user.email.split('@')[0] : null);
  
  // Format name to Title Case
  const displayName = formatNameToTitleCase(rawName);

  if (!isVisible) return null;

  // Render via Portal to document.body - ensures overlay is outside layout tree
  // This prevents any layout shifts or reflows in the dashboard
  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Enhanced Backdrop with Vignette - absolute inset-0 */}
      <div
        className={cn(
          "absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity duration-300",
          "before:absolute before:inset-0 before:bg-gradient-to-b before:from-slate-950/60 before:via-transparent before:to-slate-950/60",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={handleDismiss}
      />

      {/* Overlay Content - absolute inset-0 */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center p-4 pointer-events-none",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Card - relative (not fixed) */}
        <div
          className={cn(
            "relative w-full max-w-lg mx-auto pointer-events-auto",
            "transition-all duration-300 ease-out",
            isAnimating 
              ? "scale-100 translate-y-0 opacity-100" 
              : "scale-[0.98] translate-y-4 opacity-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Card - Match onboarding card styling exactly */}
          <div className={cn(
            "relative rounded-2xl",
            "bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90",
            "backdrop-blur-xl",
            "border border-white/10",
            "shadow-2xl",
            "p-8 md:p-10",
            "overflow-hidden",
            "onboarding-apple-shine"
          )}>
            {/* Glossy inner highlight (top sheen) - matches onboarding */}
            {/* Pulse glow animation for primary button (respects prefers-reduced-motion) */}
            <style>{`
              .onboarding-apple-shine {
                position: relative;
              }
              .onboarding-apple-shine::before {
                content: '';
                position: absolute;
                inset: 0;
                background: 
                  radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.03), transparent 50%),
                  radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.02), transparent 50%);
                pointer-events: none;
                z-index: 0;
              }
              .onboarding-apple-shine::after {
                content: '';
                position: absolute;
                inset: 0;
                background: 
                  repeating-linear-gradient(
                    0deg,
                    rgba(255, 255, 255, 0.01) 0px,
                    transparent 1px,
                    transparent 2px,
                    rgba(255, 255, 255, 0.01) 3px
                  );
                opacity: 0.4;
                pointer-events: none;
                z-index: 0;
                mix-blend-mode: soft-light;
              }
              .prime-button-pulse {
                animation: pulse-glow 1.2s ease-out;
              }
              @keyframes pulse-glow {
                0%, 100% {
                  box-shadow: 0 0 20px rgba(6, 182, 212, 0.25), 0 0 40px rgba(6, 182, 212, 0.15);
                }
                50% {
                  box-shadow: 0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(6, 182, 212, 0.3), 0 0 80px rgba(6, 182, 212, 0.2);
                }
              }
              @media (prefers-reduced-motion: reduce) {
                .prime-button-pulse {
                  animation: none;
                }
              }
            `}</style>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-all duration-200 text-slate-400 hover:text-slate-200 hover:scale-110 z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Row */}
            <div className="relative flex items-center justify-between mb-8 pb-6 border-b border-white/10 z-10">
              {/* Left: Prime Logo + Label - Match dashboard branding */}
              <div className="flex items-center gap-3">
                <PrimeLogoBadge size={40} showGlow={true} />
                <div>
                  <div className="text-sm font-semibold text-white">Prime</div>
                  <div className="text-xs text-slate-400">XspensesAI</div>
                </div>
              </div>
              
              {/* Right: Status Chip */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Secure session restored</span>
              </div>
            </div>

            {/* Content */}
            <div className="relative space-y-6 z-10">
              {/* Greeting */}
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Welcome back, {displayName}
                </h2>
                <p className="text-slate-300 text-lg">
                  Ready to keep building your financial clarity?
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {/* Primary: Continue to Dashboard - Match dashboard primary button style */}
                <button
                  onClick={handleContinue}
                  className={cn(
                    "relative w-full",
                    "bg-gradient-to-r from-cyan-500 to-teal-500",
                    "hover:from-cyan-400 hover:to-teal-400",
                    "text-white font-semibold py-4 px-6 rounded-xl",
                    "border border-white/10",
                    "shadow-lg shadow-cyan-500/25",
                    "hover:shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/30",
                    "hover:-translate-y-[1px]",
                    "active:translate-y-0 active:shadow-cyan-500/20",
                    "transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                    // Pulse glow on first open (respects prefers-reduced-motion)
                    hasPulsed && "prime-button-pulse"
                  )}
                >
                  {/* Outer glow effect - matches dashboard */}
                  <div 
                    className={cn(
                      "absolute inset-0 rounded-xl blur-xl -z-10",
                      "bg-gradient-to-r from-cyan-500/40 to-teal-500/40",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    )}
                  />
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Secondary: Prime Chat - Match dashboard secondary button style */}
                <button
                  onClick={handlePrimeChat}
                  className={cn(
                    "w-full",
                    "bg-white/5 backdrop-blur-sm",
                    "border border-white/10",
                    "hover:bg-white/10 hover:border-white/20",
                    "text-white text-sm font-medium py-3 px-4 rounded-xl",
                    "transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    "hover:-translate-y-[1px]",
                    "active:translate-y-0",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    "shadow-sm hover:shadow-md"
                  )}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Open Prime Chat</span>
                </button>

                {/* Optional: Resume Import - Match dashboard secondary button style */}
                {!loadingImport && activeImport && (
                  <button
                    onClick={handleResumeImport}
                    className={cn(
                      "w-full",
                      "bg-white/5 backdrop-blur-sm",
                      "border border-white/10",
                      "hover:bg-white/10 hover:border-white/20",
                      "text-white text-sm font-medium py-3 px-4 rounded-xl",
                      "transition-all duration-200",
                      "flex items-center justify-center gap-2",
                      "hover:-translate-y-[1px]",
                      "active:translate-y-0",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                      "shadow-sm hover:shadow-md"
                    )}
                  >
                    <FileText className="w-5 h-5" />
                    <span>Resume Import</span>
                    <span className="text-xs text-slate-400 ml-auto truncate max-w-[140px]">
                      {activeImport.fileName.length > 20 
                        ? `${activeImport.fileName.substring(0, 20)}...` 
                        : activeImport.fileName}
                    </span>
                  </button>
                )}

                {/* Tertiary: Settings - Match onboarding tertiary link */}
                <button
                  onClick={handleSettings}
                  className={cn(
                    "w-full text-slate-400 hover:text-slate-200",
                    "text-sm font-medium py-2",
                    "transition-all duration-200",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body // Portal target: render directly to body, outside layout tree
  );
}

