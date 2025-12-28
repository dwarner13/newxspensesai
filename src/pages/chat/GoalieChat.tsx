/**
 * Goalie Chat Page
 * 
 * Phase 3.3: Now uses SharedChatInterface for consistency
 * 
 * Grade 4 explanation: This page lets you chat with Goalie, 
 * one of the AI employees. The chat sends your messages to the server,
 * and Goalie responds with helpful information.
 */

/**
 * LEGACY: Goalie Chat Page
 * 
 * This page is deprecated. Routes now redirect to unified chat via ChatPageRedirect.tsx.
 * This file is kept for reference but should not be used.
 * 
 * Migration: Use UnifiedAssistantChat with employeeSlug="goalie-goals"
 */

import React from "react";
import { Navigate } from "react-router-dom";

export default function GoalieChat() {
  // Redirect to dashboard with unified chat open for Goalie
  return <Navigate to="/dashboard?chat=goalie-goals" replace />;
}
