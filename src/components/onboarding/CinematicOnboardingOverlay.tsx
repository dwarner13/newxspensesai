/**
 * Cinematic Onboarding Overlay
 * 
 * Premium AI-driven first-time setup overlay that blocks dashboard until required fields are collected.
 * Collects: first_name, country, currency, account_type, timezone
 * Features: Prime presence header, AI guidance, live summary, Custodian verification
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Check, Lock, Shield } from 'lucide-react';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';

interface CinematicOnboardingOverlayProps {
  missingFields: string[];
  onComplete: () => void;
}

type Scene = 'prime-greeting' | 'custodian-handoff' | 'first-name' | 'country' | 'currency' | 'account-type' | 'timezone' | 'confirmation';
type SubmitState = 'idle' | 'securing' | 'verifying' | 'complete';

// SINGLE SOURCE OF TRUTH: Modal dimensions - consistent across all steps
const MODAL_W = 'clamp(720px, 60vw, 860px)';
const MODAL_H = 'clamp(560px, 70vh, 640px)';

// Helper functions for display formatting
// TASK 1: Implement missing helper functions locally
function getCurrencyDisplay(currency?: string | null): string {
  if (!currency || currency.trim() === '') return 'US Dollar';
  const currencyMap: Record<string, string> = {
    'USD': 'US Dollar',
    'CAD': 'Canadian Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'AUD': 'Australian Dollar',
    'JPY': 'Japanese Yen',
    'CHF': 'Swiss Franc',
    'CNY': 'Chinese Yuan',
    'INR': 'Indian Rupee',
    'MXN': 'Mexican Peso',
    'BRL': 'Brazilian Real',
    'ZAR': 'South African Rand',
    'NZD': 'New Zealand Dollar',
    'SGD': 'Singapore Dollar',
    'HKD': 'Hong Kong Dollar',
    'SEK': 'Swedish Krona',
    'NOK': 'Norwegian Krone',
    'DKK': 'Danish Krone',
    'PLN': 'Polish Zloty',
    'RUB': 'Russian Ruble',
    'TRY': 'Turkish Lira',
  };
  return currencyMap[currency.toUpperCase()] || currency;
}

function getAccountTypeDisplay(accountType?: string | null): string {
  if (!accountType) return 'Personal';
  const accountTypeMap: Record<string, string> = {
    'personal': 'Personal',
    'business': 'Business',
    'both': 'Both',
    'unsure': 'Unsure',
  };
  return accountTypeMap[accountType.toLowerCase()] || accountType;
}

function getCountryFlag(country?: string | null): string {
  if (!country) return '🌍';
  // Simple country-to-flag emoji mapping (common countries)
  const countryFlagMap: Record<string, string> = {
    'united states': '🇺🇸',
    'usa': '🇺🇸',
    'us': '🇺🇸',
    'canada': '🇨🇦',
    'ca': '🇨🇦',
    'united kingdom': '🇬🇧',
    'uk': '🇬🇧',
    'great britain': '🇬🇧',
    'australia': '🇦🇺',
    'au': '🇦🇺',
    'germany': '🇩🇪',
    'de': '🇩🇪',
    'france': '🇫🇷',
    'fr': '🇫🇷',
    'italy': '🇮🇹',
    'it': '🇮🇹',
    'spain': '🇪🇸',
    'es': '🇪🇸',
    'japan': '🇯🇵',
    'jp': '🇯🇵',
    'china': '🇨🇳',
    'cn': '🇨🇳',
    'india': '🇮🇳',
    'in': '🇮🇳',
    'brazil': '🇧🇷',
    'br': '🇧🇷',
    'mexico': '🇲🇽',
    'mx': '🇲🇽',
    'south africa': '🇿🇦',
    'za': '🇿🇦',
    'new zealand': '🇳🇿',
    'nz': '🇳🇿',
    'singapore': '🇸🇬',
    'sg': '🇸🇬',
    'hong kong': '🇭🇰',
    'hk': '🇭🇰',
  };
  const normalized = country.toLowerCase().trim();
  return countryFlagMap[normalized] || '🌍';
}

export function CinematicOnboardingOverlay({ missingFields, onComplete }: CinematicOnboardingOverlayProps) {
  const { userId, profile, refreshProfile, user } = useAuth();
  const { refreshProfile: refreshProfileContext } = useProfileContext();
  
  // Sanitize first name: remove invalid patterns (email, username-like)
  const sanitizeFirstName = (name: string | null | undefined): string => {
    if (!name) return '';
    const trimmed = name.trim();
    
    // If contains "@" OR contains "." with digits (username-like) OR length > 24, treat as invalid
    if (trimmed.includes('@') || 
        (trimmed.includes('.') && /\d/.test(trimmed)) || 
        trimmed.length > 24) {
      return '';
    }
    
    return trimmed;
  };

  // Get initial first name: Use profiles.display_name (database schema), sanitized
  const getInitialFirstName = useMemo(() => {
    // Use profile.display_name if it exists (database schema uses display_name, not first_name)
    if (profile?.display_name && profile.display_name.trim().length > 0) {
      return sanitizeFirstName(profile.display_name);
    }
    // Return empty string - user must type (NO email, NO suggestions)
    return '';
  }, [profile]);
  
  // Location detection helper (coarse, country only)
  const [detectingLocation, setDetectingLocation] = useState(false);
  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      // Try browser geolocation API (coarse, country-level)
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Coarse location only
            timeout: 5000,
            maximumAge: 60000, // Cache for 1 minute
          });
        });
        
        // Reverse geocode to get country (would need API call in production)
        // For now, use timezone as fallback indicator
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let detectedCountry = '';
        
        // Simple timezone-to-country mapping (coarse)
        if (timezone.includes('America/New_York') || timezone.includes('America/Chicago') || 
            timezone.includes('America/Denver') || timezone.includes('America/Los_Angeles')) {
          detectedCountry = 'United States';
        } else if (timezone.includes('America/Toronto') || timezone.includes('America/Vancouver')) {
          detectedCountry = 'Canada';
        } else if (timezone.includes('Europe/London')) {
          detectedCountry = 'United Kingdom';
        } else if (timezone.includes('Europe/Paris')) {
          detectedCountry = 'France';
        } else if (timezone.includes('Asia/Tokyo')) {
          detectedCountry = 'Japan';
        } else if (timezone.includes('Australia/Sydney')) {
          detectedCountry = 'Australia';
        }
        
        if (detectedCountry) {
          setFormData(prev => ({ ...prev, country: detectedCountry }));
          toast.success(`Detected location: ${detectedCountry}`);
        }
      }
    } catch (error) {
      console.log('[Onboarding] Location detection failed or denied:', error);
      toast.error('Could not detect location. Please select manually.');
    } finally {
      setDetectingLocation(false);
    }
  };
  
  // GUARDRAIL: Single source of truth for current scene
  // Prevents duplicate renders and ensures each step renders once
  const [currentScene, setCurrentScene] = useState<Scene>('prime-greeting');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  
  // GUARDRAIL: Prevent re-mounting on profile updates
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // WOW LAYER: Handoff transition state
  const [showHandoffTransition, setShowHandoffTransition] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  
  // WOW LAYER: Respect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // WOW LAYER: Animation variants (respects reduced motion)
  const cardVariants = {
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 },
    animate: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 },
    exit: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 },
  };
  
  const cardTransition = prefersReducedMotion 
    ? { duration: 0 }
    : { duration: 0.28, ease: 'easeOut' };
  
  // Track if user has chosen a name (for Continue button animation)
  const [hasChosenName, setHasChosenName] = useState(false);
  
  // Auto-detect timezone
  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);

  const [formData, setFormData] = useState({
    first_name: getInitialFirstName, // Only sanitized first_name from profile, never display_name/email
    country: '',
    currency: profile?.currency?.trim() || 'CAD', // Default CAD for Canada
    account_type: profile?.account_type?.trim() || '',
    timezone: profile?.metadata?.timezone || detectedTimezone,
  });
  
  // Track which steps have been completed (for persistence)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // Persist step immediately after completion
  const persistStep = async (stepName: string, stepData: Partial<typeof formData>) => {
    if (!userId) return;
    
    try {
      const { getOrCreateProfile } = await import('../../lib/profileHelpers');
      const existingProfile = await getOrCreateProfile(userId, user?.email || '');
      
      if (!existingProfile) return;
      
      const updateData: Record<string, any> = {};
      
      // Map step data to profile fields
      if (stepData.first_name !== undefined) {
        // Save to both first_name and display_name columns
        updateData.first_name = stepData.first_name.trim();
        updateData.display_name = stepData.first_name.trim();
      }
      
      if (stepData.currency !== undefined) {
        updateData.currency = stepData.currency;
      }
      
      if (stepData.account_type !== undefined) {
        updateData.account_type = stepData.account_type;
      }
      
      // Update metadata
      const currentMetadata = existingProfile.metadata && typeof existingProfile.metadata === 'object'
        ? { ...existingProfile.metadata as Record<string, any> }
        : {};
      
      if (stepData.country !== undefined && stepData.country) {
        currentMetadata.country = stepData.country;
      }
      
      // Store timezone in metadata.timezone AND time_zone column (if column exists)
      if (stepData.timezone !== undefined && stepData.timezone) {
        currentMetadata.timezone = stepData.timezone;
        // Also try to save to time_zone column for backward compatibility
        updateData.time_zone = stepData.timezone;
      }
      
      if (Object.keys(currentMetadata).length > 0) {
        updateData.metadata = currentMetadata;
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
      
      if (error) {
        console.error(`[Onboarding] Failed to persist ${stepName}:`, error);
        // Don't throw - allow user to continue
      } else {
        setCompletedSteps(prev => new Set([...prev, stepName]));
        await refreshProfile?.();
        await refreshProfileContext();
      }
    } catch (error) {
      console.error(`[Onboarding] Error persisting ${stepName}:`, error);
      // Don't throw - allow user to continue
    }
  };
  
  // TASK 2: Ensure currency always has a safe value (defensive guard)
  useEffect(() => {
    if (!formData.currency || formData.currency.trim() === '') {
      setFormData(prev => ({ ...prev, currency: 'USD' }));
    }
  }, [formData.currency]);
  
  // TASK B: Clear cached onboarding values on mount
  useEffect(() => {
    const ONBOARDING_DRAFT_VERSION = 'v2';
    const storedVersion = localStorage.getItem('onboarding_draft_version');
    if (storedVersion !== ONBOARDING_DRAFT_VERSION) {
      // Clear old draft keys
      const keysToRemove = [
        'onboarding_draft',
        'onboarding_preferredName',
        'onboarding_profileDraft',
        'onboarding_completed',
        'onboarding_draft_version',
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      // Set new version
      localStorage.setItem('onboarding_draft_version', ONBOARDING_DRAFT_VERSION);
    }
  }, []);

  // Track when user types to enable Continue button animation
  useEffect(() => {
    if (formData.first_name && formData.first_name.trim().length > 0) {
      setHasChosenName(true);
    }
  }, [formData.first_name]);

  // Reactive Prime guidance text based on currency and account type
  const primeGuidanceText = useMemo(() => {
    const currency = formData.currency || 'USD';
    const accountType = formData.account_type || '';
    
    if (!accountType) {
      return 'These settings ensure accurate totals, charts, and category defaults.';
    }
    
    const currencyNames: Record<string, string> = {
      'USD': 'US Dollar',
      'CAD': 'Canadian Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'AUD': 'Australian Dollar',
      'JPY': 'Japanese Yen',
    };
    
    const currencyName = currencyNames[currency] || currency;
    const accountTypeName = accountType === 'personal' ? 'personal' : 'business';
    
    if (accountType === 'personal') {
      return `I'm configuring your workspace for ${currencyName} (${currency}) personal tracking. This sets your totals, charts, and personal category defaults.`;
    } else {
      return `I'm configuring your workspace for ${currencyName} (${currency}) business tracking. This sets your totals, charts, and business category defaults.`;
    }
  }, [formData.currency, formData.account_type]);

  // System configuration preview summary (compact format)
  const configPreview = useMemo(() => {
    const parts: string[] = [];
    
    if (formData.country) {
      parts.push(formData.country);
    }
    
    if (formData.currency) {
      parts.push(formData.currency);
    }
    
    if (formData.account_type) {
      const accountTypeName = formData.account_type === 'personal' ? 'Personal' : 'Business';
      parts.push(accountTypeName);
    }
    
    return parts.length > 0 ? parts.join(' · ') : 'Not configured';
  }, [formData.country, formData.currency, formData.account_type]);

  // Button hover tooltip text
  const confirmButtonTooltip = useMemo(() => {
    const parts: string[] = [];
    if (formData.currency) parts.push(`Currency: ${formData.currency}`);
    if (formData.account_type) parts.push(`Account type: ${formData.account_type}`);
    if (formData.country) parts.push(`Country: ${formData.country}`);
    
    return parts.length > 0 
      ? `Locking in: ${parts.join(', ')}`
      : 'Complete required fields to continue';
  }, [formData.currency, formData.account_type, formData.country]);

  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [nameStepButtonText, setNameStepButtonText] = useState<'Continue' | 'Got it.'>('Continue');
  const [editingCard, setEditingCard] = useState<'country' | 'currency' | 'account_type' | 'timezone' | null>(null);

  // Handle scene navigation with immediate persistence
  // Update onboarding_step as user progresses
  const handleNextScene = async () => {
    if (currentScene === 'prime-greeting') {
      setCurrentScene('custodian-handoff');
      // Update onboarding_status to 'in_progress' when user starts
      if (userId && profile?.onboarding_status !== 'in_progress') {
        await supabase
          .from('profiles')
          .update({ onboarding_status: 'in_progress', onboarding_step: 'custodian_handoff' })
          .eq('id', userId)
          .then(() => refreshProfile?.());
      }
    } else if (currentScene === 'custodian-handoff') {
      setCurrentScene('first-name');
    } else if (currentScene === 'first-name') {
      // Validation: First name is required
      const firstName = formData.first_name?.trim();
      if (!firstName) {
        toast.error('Please enter your preferred first name');
        return;
      }
      // Validation: Minimum 2 characters
      if (firstName.length < 2) {
        toast.error('Please enter at least 2 characters');
        return;
      }
      // Validation: No email-like strings
      if (firstName.includes('@')) {
        toast.error('Use a first name, not an email');
        return;
      }
      // Persist immediately
      await persistStep('first-name', { first_name: firstName });
      // Update onboarding_step
      if (userId) {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'first_name' })
          .eq('id', userId);
      }
      setCurrentScene('country');
    } else if (currentScene === 'country') {
      // Country is optional - persist if provided
      if (formData.country) {
        await persistStep('country', { country: formData.country });
      }
      // Update onboarding_step
      if (userId) {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'country' })
          .eq('id', userId);
      }
      setCurrentScene('currency');
    } else if (currentScene === 'currency') {
      // Currency is required
      if (!formData.currency?.trim()) {
        toast.error('Please select a currency');
        return;
      }
      // Persist immediately
      await persistStep('currency', { currency: formData.currency });
      // Update onboarding_step
      if (userId) {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'currency' })
          .eq('id', userId);
      }
      setCurrentScene('account-type');
    } else if (currentScene === 'account-type') {
      // Account type is required
      if (!formData.account_type?.trim()) {
        toast.error('Please select an account type');
        return;
      }
      // Persist immediately
      await persistStep('account-type', { account_type: formData.account_type });
      // Update onboarding_step
      if (userId) {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'account_type' })
          .eq('id', userId);
      }
      setCurrentScene('timezone');
    } else if (currentScene === 'timezone') {
      // Timezone is optional - persist if provided
      if (formData.timezone) {
        await persistStep('timezone', { timezone: formData.timezone });
      }
      // Update onboarding_step
      if (userId) {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'timezone' })
          .eq('id', userId);
      }
      // Move to confirmation and finalize
      setCurrentScene('confirmation');
      handleSubmit();
    }
  };

  const handleBackScene = () => {
    if (currentScene === 'custodian-handoff') {
      setCurrentScene('prime-greeting');
    } else if (currentScene === 'first-name') {
      setCurrentScene('custodian-handoff');
    } else if (currentScene === 'country') {
      setCurrentScene('first-name');
    } else if (currentScene === 'currency') {
      setCurrentScene('country');
    } else if (currentScene === 'account-type') {
      setCurrentScene('currency');
    } else if (currentScene === 'timezone') {
      setCurrentScene('account-type');
    }
  };

  // GUARDRAIL: Pre-fill from profile if available (ONLY if first_name already exists)
  // TASK A: Never derive from email - only use existing profile values
  // Only runs once on mount to prevent duplicate updates
  useEffect(() => {
    if (profile && !hasInitialized) {
      const metadata = profile.metadata && typeof profile.metadata === 'object' 
        ? profile.metadata as Record<string, any>
        : null;
      
      setFormData(prev => ({
        // Use existing profile values (display_name from database)
        first_name: getInitialFirstName || prev.first_name,
        country: metadata?.country || prev.country,
        currency: profile.currency || prev.currency || 'CAD', // Default CAD
        account_type: profile.account_type || prev.account_type,
        timezone: metadata?.timezone || prev.timezone || detectedTimezone,
      }));
      setHasInitialized(true);
    }
  }, [profile, hasInitialized, getInitialFirstName, detectedTimezone]);

  // No username detection - user is in control

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // TASK 2: Defensive defaults - ensure currency always has a safe value
      const newValue = name === 'currency' && (!value || value.trim() === '') ? 'USD' : value;
      return {
        ...prev,
        [name]: newValue,
      };
    });
  };

  const handleSubmit = async () => {
    // TASK C: Hard guard session + userId
    if (!userId) {
      toast.error('Please sign in to continue. Please refresh the page and try again.', {
        id: 'onboarding-auth-error',
        duration: 5000,
        position: 'top-center',
      });
      setSubmitState('idle');
      return;
    }

    // Final validation: Required fields must be present
    if (!formData.first_name?.trim() || !formData.currency?.trim() || !formData.account_type?.trim()) {
      const missingField = !formData.first_name?.trim() ? 'first name' : 
                          !formData.currency?.trim() ? 'currency' : 'account type';
      toast.error(`Please complete all required fields. Missing: ${missingField}`, {
        id: 'onboarding-validation-error',
        duration: 4000,
        position: 'top-center',
      });
      setSubmitState('idle');
      // Go back to first incomplete step
      if (!formData.first_name?.trim()) {
        setCurrentScene('first-name');
      } else if (!formData.currency?.trim()) {
        setCurrentScene('currency');
      } else if (!formData.account_type?.trim()) {
        setCurrentScene('account-type');
      }
      return;
    }

    try {
      // If we're already verifying (from defaults scene), skip to data update
      // Otherwise, show securing and verification states
      if (submitState !== 'verifying') {
        // Step 1: Securing profile
        setSubmitState('securing');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 2: Custodian verification
        setSubmitState('verifying');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // TASK C: Ensure profile exists before updating
      const { getOrCreateProfile } = await import('../../lib/profileHelpers');
      const existingProfile = await getOrCreateProfile(userId, user?.email || '');
      
      if (!existingProfile) {
        const errorMsg = 'Failed to load or create profile. Please try again.';
        toast.error(errorMsg, {
          id: 'onboarding-profile-error',
          duration: 5000,
          position: 'top-center',
        });
        setSubmitState('idle');
        setCurrentScene('first-name');
        return;
      }

      // Final save: All steps should already be persisted, but ensure completion
      // IMPORTANT: Do NOT include 'id' in update payload - use .eq('id', userId) instead
      // Save first_name, last_name, full_name, display_name properly
      const firstName = formData.first_name.trim();
      const lastName = formData.last_name?.trim() || null;
      const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;
      
      const updateData: Record<string, any> = {
        email: user?.email || null,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        display_name: firstName, // Display name defaults to first name
        currency: formData.currency,
        account_type: formData.account_type.trim(),
        onboarding_completed: true,
        onboarding_status: 'completed',
        onboarding_step: 'done', // Set to 'done' on completion
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update metadata with country and timezone if provided
      const currentMetadata = existingProfile.metadata && typeof existingProfile.metadata === 'object'
        ? { ...existingProfile.metadata as Record<string, any> }
        : {};
      
      if (formData.country) {
        currentMetadata.country = formData.country;
      }
      
      if (formData.timezone) {
        currentMetadata.timezone = formData.timezone;
        // Also save to time_zone column if it exists
        updateData.time_zone = formData.timezone;
      }

      // Ensure metadata.onboarding.completed is set
      if (!currentMetadata.onboarding) {
        currentMetadata.onboarding = {};
      }
      currentMetadata.onboarding.completed = true;
      currentMetadata.onboarding.completedAt = new Date().toISOString();

      updateData.metadata = currentMetadata;

      if (import.meta.env.DEV) {
        console.log('[CinematicOnboardingOverlay] Saving profile update:', {
          userId,
          updateData: { ...updateData, metadata: '[...]' }, // Don't log full metadata
        });
      }

      // Try update with all fields first
      let updatePayload = { ...updateData };
      let { error, data } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      // If error is due to missing columns (onboarding_status/onboarding_step), retry without them
      if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        if (import.meta.env.DEV) {
          console.warn('[CinematicOnboardingOverlay] Schema error detected, retrying without onboarding_status/onboarding_step:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
        }
        
        // Remove potentially missing columns and retry
        const { onboarding_status, onboarding_step, ...safeUpdateData } = updatePayload;
        updatePayload = safeUpdateData;
        
        const retryResult = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId)
          .select()
          .single();
        
        error = retryResult.error;
        data = retryResult.data;
      }

      if (error) {
        // HARD GUARD: Never crash dashboard - show inline error and keep overlay open
        console.error('[Onboarding] Supabase update error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          response: error,
        });
        
        // Log full error response for debugging
        if (import.meta.env.DEV) {
          console.error('[Onboarding] Full error object:', JSON.stringify(error, null, 2));
          console.error('[Onboarding] Update payload attempted:', JSON.stringify(updatePayload, null, 2));
        }
        
        // Check for schema cache errors specifically
        if (error.message?.includes('schema cache') || error.message?.includes('column') || error.code === 'PGRST116' || error.code === 'PGRST204') {
          const schemaError = 'Database schema is out of sync. Please refresh the page or contact support if this persists.';
          setSubmitState('idle');
          setCurrentScene('first-name'); // Go back to first incomplete step
          toast.error(schemaError, {
            id: 'onboarding-schema-error',
            duration: 6000,
            position: 'top-center',
            style: {
              background: 'rgba(239, 68, 68, 0.95)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
            },
          });
          return; // Don't throw - keep overlay open
        }
        
        // Check for 400 Bad Request errors
        if (error.code === 'PGRST204' || error.message?.includes('400') || error.message?.includes('Bad Request')) {
          const badRequestError = `Failed to save: ${error.message || 'Invalid data format'}. Please check your input and try again.`;
          setSubmitState('idle');
          setCurrentScene('first-name');
          toast.error(badRequestError, {
            id: 'onboarding-bad-request-error',
            duration: 6000,
            position: 'top-center',
            style: {
              background: 'rgba(239, 68, 68, 0.95)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
            },
          });
          return;
        }
        
        throw new Error(error.message || 'Failed to save your information');
      }

      if (!data) {
        throw new Error('Profile update succeeded but no data returned');
      }

      // Refresh both AuthContext and ProfileContext
      await refreshProfile?.();
      await refreshProfileContext();
      
      if (import.meta.env.DEV) {
        console.log('[CinematicOnboardingOverlay] ✅ Profile refreshed in both contexts');
      }

      // Set sessionStorage flag to trigger Prime Welcome overlay after navigation
      sessionStorage.setItem('xspenses_onboarding_just_completed', '1');

      // Step 3: Complete
      setSubmitState('complete');
      
      // WOW LAYER 5: Completion moment - show message then fade
      setShowCompletionMessage(true);
      await new Promise(resolve => setTimeout(resolve, prefersReducedMotion ? 200 : 800));
      setShowCompletionMessage(false);
      
      // Brief fade before calling onComplete
      await new Promise(resolve => setTimeout(resolve, prefersReducedMotion ? 100 : 300));
      
      // TASK C: Only navigate after save succeeds
      onComplete();
    } catch (error: any) {
      // HARD GUARD: Never crash dashboard - show inline error and keep overlay open
      console.error('[Onboarding] Error completing onboarding:', error);
      
      // Extract user-friendly error message
      let errorMessage = 'Failed to save your information. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
        
        // Handle schema cache errors specifically
        if (error.message.includes('schema cache') || error.message.includes('column') || error.code === 'PGRST116') {
          errorMessage = 'Database schema is out of sync. Please refresh the page or contact support if this persists.';
        }
      }
      
      // Show error as toast overlay (not inline)
      setSubmitState('idle');
      setCurrentScene('first-name'); // Go back to first step on error
      toast.error(errorMessage, {
        id: 'onboarding-save-error',
        duration: 6000,
        position: 'top-center',
        style: {
          background: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.5)',
        },
      });
      
      // DO NOT call onComplete() or navigate - keep overlay open so user can retry
    }
  };

  const isSubmitting = submitState !== 'idle';
  const showCompleteState = submitState === 'complete';

  // GUARDRAIL: Prevent rendering if component unmounts or invalid state
  if (!userId) {
    return null;
  }

  return (
    <AnimatePresence mode="wait" key="onboarding-overlay-container">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-16 overflow-hidden"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onWheel={(e) => {
          // Prevent page scroll when overlay is open
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          // Prevent page scroll on mobile
          e.stopPropagation();
        }}
      >
        {/* Backdrop with blur */}
        {/* WOW LAYER 3: Dim background during handoff transition */}
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ 
            opacity: showHandoffTransition ? 0.68 : 1, // Dim 5-8% during handoff
            backdropFilter: 'blur(20px)' 
          }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          className="absolute inset-0 bg-black/60"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            // Prevent closing on backdrop click during onboarding
            e.stopPropagation();
          }}
        />
        
        <>
          {/* WOW LAYER 5: Completion message overlay */}
          {showCompletionMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-[10000] pointer-events-none"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                className="text-center"
              >
                <h2 className="text-3xl font-semibold text-white mb-2">
                  Your workspace is ready.
                </h2>
              </motion.div>
            </motion.div>
          )}

          {/* WOW LAYER 3: Handoff Transition Card */}
          {showHandoffTransition && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-12"
              style={{ maxHeight: '80vh' }}
            >
              {/* WOW LAYER 3: Lock icon forms from particles, one soft pulse, then holds */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.2, duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeOut' }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-6"
              >
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{ 
                    scale: prefersReducedMotion ? 1 : [1, 1.1, 1],
                    boxShadow: prefersReducedMotion ? 'none' : [
                      '0 0 0px rgba(16, 185, 129, 0)',
                      '0 0 20px rgba(16, 185, 129, 0.4)',
                      '0 0 0px rgba(16, 185, 129, 0)',
                    ],
                  }}
                  transition={{ 
                    duration: prefersReducedMotion ? 0 : 0.6,
                    delay: prefersReducedMotion ? 0 : 0.4,
                    ease: 'easeOut',
                  }}
                >
                  <Lock className="w-8 h-8 text-emerald-400" />
                </motion.div>
              </motion.div>
              <h2 className="text-2xl font-semibold text-white mb-3 text-center">
                Securing your workspace
              </h2>
              <p className="text-sm text-slate-300 text-center">
                Custodian is preparing your account defaults.
              </p>
            </motion.div>
          )}

          {/* Content - Fixed dimensions to prevent resizing */}
          {/* GUARDRAIL: Unique key per scene ensures proper unmount/remount */}
          {/* WOW LAYER 1: Card entrance animation (fade + scale) */}
          {!showHandoffTransition && (
          <motion.div
            key={`onboarding-scene-${currentScene}`}
            initial={cardVariants.initial}
            animate={cardVariants.animate}
            exit={cardVariants.exit}
            transition={cardTransition}
            className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-amber-500/20 rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
            style={{
              width: MODAL_W,
              height: MODAL_H,
            }}
          >
          {/* Premium animated gradient glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 60%)',
                'radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
                'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 60%)',
              ],
            }}
            transition={{
              duration: prefersReducedMotion ? 0 : 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Subtle scan shimmer */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                background: [
                  'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 50%, transparent 100%)',
                  'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 50%, transparent 100%)',
                ],
                backgroundPosition: ['-200% 0', '200% 0'],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}
          
          {/* Inner content container - grid layout: header (auto) / content (1fr) / footer (auto) */}
          <div className="relative z-10 grid grid-rows-[auto_1fr_auto] h-full min-h-0">
            {/* Fixed Header */}
            <div className="shrink-0 px-8 pt-7 pb-5 border-b border-slate-700/50">
              {/* Header - Prime or Custodian based on scene */}
              <div className="flex items-center gap-3">
              {currentScene === 'custodian-handoff' || currentScene === 'first-name' || (currentScene === 'confirmation' && submitState === 'complete') ? (
                <>
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700/60 flex items-center justify-center shadow-lg">
                    <Shield className="w-5 h-5 text-emerald-400 relative z-10" />
                    {/* Pulsing aura around Custodian badge */}
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute inset-0 rounded-full border border-emerald-400/30"
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">Custodian</span>
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-2 h-2 rounded-full bg-emerald-400"
                      />
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {submitState === 'securing' ? 'Securing profile...' : 
                       submitState === 'verifying' ? 'Verifying setup...' :
                       submitState === 'complete' ? 'Account secured' :
                       'Security & Compliance AI'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* WOW LAYER 2: Prime presence - ambient glow on crown */}
                  <div className="relative">
                    <PrimeLogoBadge size={40} showGlow={true} />
                    {!prefersReducedMotion && (
                      <motion.div
                        animate={{
                          boxShadow: [
                            '0 0 20px rgba(245, 158, 11, 0.3)',
                            '0 0 30px rgba(245, 158, 11, 0.5)',
                            '0 0 20px rgba(245, 158, 11, 0.3)',
                          ],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute inset-0 rounded-full pointer-events-none"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-lg font-semibold text-white">Prime</span>
                      {/* WOW LAYER 2: Status dot pulses every 3 seconds */}
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ 
                          duration: prefersReducedMotion ? 0 : 3, 
                          repeat: Infinity, 
                          ease: 'easeInOut' 
                        }}
                        className="w-2 h-2 rounded-full bg-amber-400"
                      />
                    </motion.div>
                    {/* WOW LAYER 2: Subtitle fades in after title */}
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: prefersReducedMotion ? 0 : 0.2, duration: 0.4 }}
                      className="text-sm text-slate-400 mt-0.5"
                    >
                      {submitState === 'securing' ? 'Securing profile...' : 
                       submitState === 'verifying' ? 'Custodian verification...' :
                       submitState === 'complete' ? 'Setup complete' :
                       'AI Financial Guide & Orchestrator'}
                    </motion.p>
                  </div>
                </>
              )}
              </div>
            </div>
            
            {/* Scrollable Body - only scrolls if content exceeds available space */}
            <div className="px-8 pb-6 overflow-y-auto hide-scrollbar min-h-0">
              {/* Scene Content */}
              <div className="flex flex-col">

              {/* GUARDRAIL: Each scene renders once via single conditional check */}
              {/* Scene 1: Prime Greeting - Cinematic Intro Card */}
              {currentScene === 'prime-greeting' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-4"
                >
                  <div className="text-center max-w-lg mx-auto">
                    <h1 className="text-2xl font-semibold text-white mb-6">
                      Welcome to XspensesAI
                    </h1>
                    {/* WOW LAYER 1: Text stagger - paragraphs fade in with 60ms delay */}
                    <div className="space-y-3 text-sm text-slate-300 leading-relaxed mb-8">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0, duration: prefersReducedMotion ? 0 : 0.4 }}
                      >
                        I'm Prime — your AI financial guide and orchestrator.
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.06, duration: prefersReducedMotion ? 0 : 0.4 }}
                      >
                        I help you understand your money and surface insights across your dashboard.
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.12, duration: prefersReducedMotion ? 0 : 0.4 }}
                      >
                        Before you begin, I'll hand things over to Custodian to securely set up your account.
                      </motion.p>
                    </div>
                  </div>
                  {/* Primary Action Button */}
                  {/* WOW LAYER 1: Button hover glow pulse */}
                  <div className="group relative inline-block w-full max-w-sm">
                    {/* Perimeter glow aura - WOW: subtle pulse on hover */}
                    <motion.div
                      className="pointer-events-none absolute inset-[-3px] rounded-full opacity-0 bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 blur-xl"
                      animate={{
                        opacity: 0,
                      }}
                      whileHover={{
                        opacity: [0, 0.5, 0.4],
                      }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.18,
                        repeat: Infinity,
                        repeatType: 'reverse' as const,
                      }}
                    />
                    <button
                      onClick={handleNextScene}
                      className="group/btn relative w-full inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-semibold tracking-wide text-white bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700/60 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 focus-visible:outline-none"
                      style={{
                        boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.4), 0 10px 28px rgba(15,23,42,0.9)',
                      } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        if (!prefersReducedMotion) {
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.6), 0 0 12px rgba(245, 158, 11, 0.4), 0 12px 32px rgba(15,23,42,0.95)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.4), 0 10px 28px rgba(15,23,42,0.9)';
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = '2px solid rgba(245, 158, 11, 0.6)';
                        e.currentTarget.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.outline = 'none';
                        e.currentTarget.style.outlineOffset = '0';
                      }}
                    >
                      {/* Top-left reflective shine */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                      <span className="relative">Continue</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* GUARDRAIL: Single render path - no duplicate messages */}
              {/* Scene 2: Custodian Handoff - Cinematic AI Employee Transition */}
              {currentScene === 'custodian-handoff' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-4"
                >
                  <div className="text-center max-w-lg mx-auto mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-6">
                      Account setup in progress
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                      I'm handing things over to Custodian — our AI responsible for security, privacy, and system defaults.
                    </p>
                    
                    {/* Animated Lock Indicator */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center"
                      >
                        <Lock className="w-6 h-6 text-emerald-400" />
                      </motion.div>
                      <motion.p
                        animate={{
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="text-xs text-emerald-400 font-medium"
                      >
                        Securing your workspace…
                      </motion.p>
                    </div>
                  </div>
                  
                  {/* Primary Action Button */}
                  <div className="group relative inline-block w-full max-w-sm">
                    {/* Perimeter glow aura - emerald for Custodian */}
                    <div
                      className="pointer-events-none absolute inset-[-3px] rounded-full opacity-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 blur-xl transition-opacity duration-200 group-hover:opacity-50 group-has-[:active]:opacity-60"
                    />
                    <button
                      onClick={handleNextScene}
                      className="group/btn relative w-full inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-semibold tracking-wide text-white bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700/60 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 focus-visible:outline-none"
                      style={{
                        boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.4), 0 10px 28px rgba(15,23,42,0.9)',
                      } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.6), 0 12px 32px rgba(15,23,42,0.95)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.4), 0 10px 28px rgba(15,23,42,0.9)';
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = '2px solid rgba(16, 185, 129, 0.6)';
                        e.currentTarget.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.outline = 'none';
                        e.currentTarget.style.outlineOffset = '0';
                      }}
                    >
                      {/* Top-left reflective shine */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                      <span className="relative">Continue</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Scene 3: First Name - Premium Custodian Step */}
              {currentScene === 'first-name' && (
                <motion.div
                  key="first-name-scene"
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={cardTransition}
                  className="flex flex-col"
                >
                  {import.meta.env.DEV && console.log('[Onboarding] step render', 'first-name')}
                  <div className="w-full">
                    {/* Main Title - Fade in */}
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="text-xl font-semibold text-white mb-2"
                    >
                      Let's secure your account
                    </motion.h1>
                    
                    {/* Subtext - Fade in */}
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15 }}
                      className="text-sm text-slate-400 mb-4"
                    >
                      First, tell me what name you'd like Prime to use. You can change this anytime in Account Center.
                    </motion.p>
                    
                    {/* Security Micro-row - Fade in */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="flex items-center gap-3 mb-4"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Stored securely</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Private by default</span>
                      </div>
                    </motion.div>
                    
                    {/* Form Input - Fade in */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.25 }}
                      className="mb-3"
                    >
                      <label htmlFor="first_name" className="block text-sm font-medium text-slate-300 mb-1.5">
                        First name
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        autoFocus
                        className="w-full h-12 px-4 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
                        placeholder="e.g., Darrell"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        This is how Prime will address you.
                      </p>
                      {/* Validation warnings */}
                      {formData.first_name && formData.first_name.trim().length > 0 && (
                        <>
                          {/* Email validation warning */}
                          {formData.first_name.includes('@') && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2 text-xs text-amber-400 flex items-center gap-1"
                            >
                              <span>⚠️</span>
                              <span>Use a first name, not an email</span>
                            </motion.p>
                          )}
                          {/* Username-like pattern warning */}
                          {formData.first_name.includes('.') && /\d/.test(formData.first_name) && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2 text-xs text-amber-400 flex items-center gap-1"
                            >
                              <span>⚠️</span>
                              <span>Please enter your first name (not an email or username)</span>
                            </motion.p>
                          )}
                          {/* Invalid characters warning */}
                          {!/^[A-Za-z\s'-]*$/.test(formData.first_name) && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2 text-xs text-amber-400 flex items-center gap-1"
                            >
                              <span>⚠️</span>
                              <span>Use only letters, spaces, apostrophes, and hyphens</span>
                            </motion.p>
                          )}
                        </>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Scene 4: Country - Clean Card Step */}
              {currentScene === 'country' && (
                <motion.div
                  key="country-scene"
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={cardTransition}
                  className="flex flex-col"
                >
                  {import.meta.env.DEV && console.log('[Onboarding] step render', 'country')}
                  <div className="w-full">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Where are you located?
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                      We only store your country for defaults. This helps us provide accurate insights.
                    </p>
                    <div className="mb-3">
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        autoFocus
                        className="w-full h-12 px-4 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                        placeholder="Country name"
                      />
                    </div>
                    <button
                      onClick={detectLocation}
                      disabled={detectingLocation}
                      className="w-full h-12 px-4 text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {detectingLocation ? 'Detecting...' : 'Use my device location'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Scene 5: Currency - Clean Card Step */}
              {currentScene === 'currency' && (
                <motion.div
                  key="currency-scene"
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={cardTransition}
                  className="flex flex-col"
                >
                  {import.meta.env.DEV && console.log('[Onboarding] step render', 'currency')}
                  <div className="w-full">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      What currency do you use?
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                      This sets your totals, charts, and categorization rules.
                    </p>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      autoFocus
                      className="w-full h-12 px-4 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                    >
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Scene 6: Account Type - Clean Card Step */}
              {currentScene === 'account-type' && (
                <motion.div
                  key="account-type-scene"
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={cardTransition}
                  className="flex flex-col"
                >
                  {import.meta.env.DEV && console.log('[Onboarding] step render', 'account-type')}
                  <div className="w-full">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      What type of account is this?
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                      This improves category and feature defaults.
                    </p>
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, account_type: 'personal' }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 text-left ${
                          formData.account_type === 'personal'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                            : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-medium text-sm">Personal</div>
                        <div className="text-xs opacity-75 mt-0.5">For personal expense tracking</div>
                      </button>
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, account_type: 'business' }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 text-left ${
                          formData.account_type === 'business'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                            : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-medium text-sm">Business</div>
                        <div className="text-xs opacity-75 mt-0.5">For business expense tracking</div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Scene 7: Timezone - Clean Card Step */}
              {currentScene === 'timezone' && (
                <motion.div
                  key="timezone-scene"
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={cardTransition}
                  className="flex flex-col"
                >
                  {import.meta.env.DEV && console.log('[Onboarding] step render', 'timezone')}
                  <div className="w-full">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      What's your timezone?
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                      Auto-detected: {detectedTimezone}. You can change this if needed.
                    </p>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      autoFocus
                      className="w-full h-12 px-4 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                    >
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                      <option value="America/Denver">America/Denver (MST/MDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                      <option value="America/Vancouver">America/Vancouver (PST/PDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {/* GUARDRAIL: Final confirmation - single render */}
              {/* Scene 5: Confirmation */}
              {currentScene === 'confirmation' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-4"
                >
                  {submitState === 'securing' && (
                    <div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full mx-auto mb-4"
                      />
                      <p className="text-lg text-slate-300">Securing your profile...</p>
                    </div>
                  )}
                  
                  {submitState === 'verifying' && (
                    <div>
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4"
                      >
                        <Shield className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <p className="text-lg text-slate-300 mb-2">Custodian verification...</p>
                    </div>
                  )}
                  
                  {submitState === 'complete' && (
                    <div className="space-y-6">
                      {/* Custodian confirmation */}
                      <div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                          className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30"
                        >
                          <Shield className="w-8 h-8 text-white" />
                        </motion.div>
                        <p className="text-lg text-slate-300 mb-6">
                          Your account has been secured.
                        </p>
                      </div>
                      
                      {/* Prime confirmation */}
                      <div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                          className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30"
                        >
                          <Check className="w-8 h-8 text-white" />
                        </motion.div>
                        <h3 className="text-2xl font-semibold text-white mb-2">
                          All set.
                        </h3>
                        <p className="text-slate-400">
                          I'll see you inside your dashboard.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              </div>
            </div>
            
            {/* Fixed Footer - always visible, never clipped */}
            {(currentScene === 'first-name' || currentScene === 'country' || currentScene === 'currency' || currentScene === 'account-type' || currentScene === 'timezone') && (
              <div 
                key={`footer-${currentScene}`}
                className="shrink-0 px-8 py-5 border-t border-white/10 bg-slate-900/95 backdrop-blur-md"
              >
                {import.meta.env.DEV && console.log('[Onboarding] footer render', currentScene)}
                <div className="flex items-center justify-between gap-6">
                  {/* Back button - left aligned */}
                  <button
                    onClick={handleBackScene}
                    className="min-w-[100px] h-11 px-5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                  >
                    Back
                  </button>
                  
                  {/* Primary action button - right aligned */}
                  <div className="group relative inline-block">
                    {/* Perimeter glow aura - emerald for Custodian */}
                    <motion.div
                      className="pointer-events-none absolute inset-[-3px] rounded-full opacity-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 blur-xl"
                      animate={{
                        opacity: 0,
                      }}
                      whileHover={{
                        opacity: [0, 0.5, 0.4],
                      }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.18,
                        repeat: Infinity,
                        repeatType: 'reverse' as const,
                      }}
                    />
                    <motion.button
                      onClick={handleNextScene}
                      disabled={
                        (currentScene === 'first-name' && (
                          !formData.first_name?.trim() || 
                          formData.first_name.trim().length < 2 ||
                          !/^[A-Za-z\s'-]+$/.test(formData.first_name.trim()) ||
                          formData.first_name.includes('@') ||
                          (formData.first_name.includes('.') && /\d/.test(formData.first_name)) ||
                          formData.first_name.trim().length > 24
                        )) ||
                        (currentScene === 'currency' && !formData.currency?.trim()) ||
                        (currentScene === 'account-type' && !formData.account_type?.trim())
                      }
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ 
                        opacity: 1,
                        y: 0
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="group/btn relative inline-flex items-center justify-center rounded-full min-w-[140px] h-11 px-6 text-sm font-semibold tracking-wide text-white bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700/60 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      style={{
                        boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.4), 0 10px 28px rgba(15,23,42,0.9)',
                      } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled && !prefersReducedMotion) {
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.6), 0 0 12px rgba(16, 185, 129, 0.4), 0 12px 32px rgba(15,23,42,0.95)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.4), 0 10px 28px rgba(15,23,42,0.9)';
                      }}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                      <span className="relative">
                        {currentScene === 'first-name' ? 'Save & Continue' : 'Continue'}
                      </span>
                    </motion.button>
                  </div>
                </div>
                {/* Error messages shown as toast overlay (not inline) - handled in handleSubmit */}
              </div>
            )}
          </div>
        </motion.div>
          )}
        </>
      </motion.div>
    </AnimatePresence>
  );
}

