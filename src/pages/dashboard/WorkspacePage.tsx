/**
 * WorkspacePage Component
 * 
 * Workspace view - matches main dashboard structure with all sections
 * 
 * NOTE: This page uses ConnectedDashboard to maintain consistency with the main dashboard.
 * All dashboard tabs should show the same full dashboard structure.
 */

import React from 'react';
import { ConnectedDashboard } from '../../components/dashboard/ConnectedDashboard';

export default function WorkspacePage() {
  return <ConnectedDashboard />;
}

