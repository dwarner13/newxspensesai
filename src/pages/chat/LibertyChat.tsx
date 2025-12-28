/**
 * Liberty Chat Page
 * 
 * Phase 3.3: Now uses SharedChatInterface for consistency
 * 
 * Grade 4 explanation: This page lets you chat with Liberty, 
 * one of the AI employees. The chat sends your messages to the server,
 * and Liberty responds with helpful information.
 */

/**
 * LEGACY: Liberty Chat Page
 * 
 * This page is deprecated. Routes now redirect to unified chat via ChatPageRedirect.tsx.
 * This file is kept for reference but should not be used.
 * 
 * Migration: Use UnifiedAssistantChat with employeeSlug="liberty-freedom"
 */

import React from "react";
import { Navigate } from "react-router-dom";

export default function LibertyChat() {
  // Redirect to dashboard with unified chat open for Liberty
  return <Navigate to="/dashboard?chat=liberty-freedom" replace />;
}
