/**
 * Prime Tools Button Component
 * 
 * Floating button + quick action panel for Prime Workspace page only.
 * Replaces the global "Ask Prime" launcher on the Prime Chat page.
 */

import React from 'react';
import { Settings, Users, RefreshCw, Brain, PlugZap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PrimeRightPanel, type PrimePanelId } from './PrimeRightPanel';
import { PrimeTeamStatusPanel } from './panels/PrimeTeamStatusPanel';
import { PrimeSettingsPanel } from './panels/PrimeSettingsPanel';
import { PrimeMemoryCenterPanel } from './panels/PrimeMemoryCenterPanel';
import { PrimeToolsIntegrationsPanel } from './panels/PrimeToolsIntegrationsPanel';
import { usePrimeLiveStats } from '../../hooks/usePrimeLiveStats';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { usePrimeOverlay } from '../../context/PrimeOverlayContext';
import { PrimeToolsCommandCenter } from './PrimeToolsCommandCenter';

type PrimeToolsButtonProps = {
  className?: string;
  onOpenTasks?: () => void;
};

type PrimePanelIdWithNull = PrimePanelId | null;

export const PrimeToolsButton: React.FC<PrimeToolsButtonProps> = ({
  className,
  onOpenTasks,
}) => {
  const { primeToolsOpen, setPrimeToolsOpen } = usePrimeOverlay();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [activePrimePanel, setActivePrimePanel] = React.useState<PrimePanelIdWithNull>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelLeft, setPanelLeft] = React.useState<number>(0);

  // Safety log to confirm component mounts
  React.useEffect(() => {
    console.log("[PrimeToolsButton] mounted");
  }, []);

  // Hooks for refresh functionality
  const primeStats = usePrimeLiveStats();
  const activityFeed = useActivityFeed({ category: 'prime', pollMs: 60000 });

  // Track if any overlay is open (menu or panel)
  const hasAnyOverlayOpen = menuOpen || activePrimePanel !== null;

  // Update overlay state when menu/panel state changes
  React.useEffect(() => {
    setPrimeToolsOpen(hasAnyOverlayOpen);
  }, [hasAnyOverlayOpen, setPrimeToolsOpen]);

  // Measure panel position for floating buttons
  React.useEffect(() => {
    if (activePrimePanel !== null && panelRef.current) {
      const updatePanelPosition = () => {
        const rect = panelRef.current?.getBoundingClientRect();
        if (rect) {
          setPanelLeft(rect.left);
        }
      };

      updatePanelPosition();
      window.addEventListener('resize', updatePanelPosition);
      window.addEventListener('scroll', updatePanelPosition);

      return () => {
        window.removeEventListener('resize', updatePanelPosition);
        window.removeEventListener('scroll', updatePanelPosition);
      };
    }
  }, [activePrimePanel]);

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    // If closing menu but panel is still open, overlay stays open
  };

  const handleCloseAll = () => {
    setMenuOpen(false);
    setActivePrimePanel(null);
  };

  // Live stats (stubbed for now, can be wired to real data later)
  const onlineAgents = primeStats.data?.onlineEmployees ?? 0;
  const totalAgents = primeStats.data?.totalEmployees ?? 11;
  const lastCheckLabel = primeStats.isLoading || activityFeed.isLoading ? "Checking..." : "Just now";
  const routingRulesCount = 4; // TODO: wire to real data
  const memoryCount = 0; // TODO: wire to real data
  const connectedApps = 0; // TODO: wire to real data
  const totalApps = 4; // TODO: wire to real data

  // Tool cards configuration with live stats
  type PrimeToolCard = {
    id: PrimePanelId | "status";
    label: string;
    description: string;
    statLabel: string;
    statValue: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  };

  const tools: PrimeToolCard[] = [
    {
      id: "team",
      label: "View Team",
      description: "Who's online & working.",
      statLabel: "Agents",
      statValue: `${onlineAgents}/${totalAgents}`,
      icon: Users,
      onClick: () => {
        setActivePrimePanel("team");
        setMenuOpen(false);
      },
    },
    {
      id: "status",
      label: "System Status",
      description: "Routing & guardrails.",
      statLabel: "Last check",
      statValue: lastCheckLabel,
      icon: RefreshCw,
      onClick: async () => {
        await Promise.all([
          primeStats.refetch(),
          activityFeed.refetch(),
        ]);
        // Don't close menu, just refresh
      },
    },
    {
      id: "settings",
      label: "Prime Settings",
      description: "Tone & routing rules.",
      statLabel: "Rules",
      statValue: `${routingRulesCount}`,
      icon: Settings,
      onClick: () => {
        setActivePrimePanel("settings");
        setMenuOpen(false);
      },
    },
    {
      id: "memory",
      label: "Memory Center",
      description: "What Prime remembers.",
      statLabel: "Memories",
      statValue: `${memoryCount}`,
      icon: Brain,
      onClick: () => {
        setActivePrimePanel("memory");
        setMenuOpen(false);
      },
    },
    {
      id: "integrations",
      label: "Integrations",
      description: "Data sources & apps.",
      statLabel: "Connected",
      statValue: `${connectedApps}/${totalApps}`,
      icon: PlugZap,
      onClick: () => {
        setActivePrimePanel("integrations");
        setMenuOpen(false);
      },
    },
  ];

  // Floating buttons configuration
  const floatingButtons = [
    { id: "team" as PrimePanelId, icon: Users, label: "Team" },
    { id: "settings" as PrimePanelId, icon: Settings, label: "Settings" },
    { id: "memory" as PrimePanelId, icon: Brain, label: "Memory" },
    { id: "integrations" as PrimePanelId, icon: PlugZap, label: "Tools" },
  ];

  return (
    <>
      {/* Blurred backdrop when any overlay is open */}
      {hasAnyOverlayOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
          onClick={handleCloseAll}
        />
      )}

      {/* Floating tool buttons - attached to panel's left edge */}
      {activePrimePanel !== null && panelLeft > 0 && (
        <div
          className="fixed z-40 flex flex-col gap-3 top-[120px] md:top-[124px]"
          style={{
            left: `${panelLeft - 72}px`,
          }}
        >
          {floatingButtons.map((btn) => {
            const Icon = btn.icon;
            const isActive = activePrimePanel === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setActivePrimePanel(btn.id)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "bg-sky-500/80 text-white shadow-[0_0_25px_rgba(56,189,248,0.8)] border border-sky-400/80 scale-110"
                    : "bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white hover:scale-105"
                )}
                aria-label={btn.label}
                title={btn.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          'fixed z-50 bottom-4 right-4 md:bottom-6 md:right-8 pointer-events-none',
          className
        )}
      >
        <div className="relative flex flex-col items-end gap-3 pointer-events-auto">
          {/* WOW Prime Tools Command Center - only show when menu is open and no panel is open */}
          {menuOpen && activePrimePanel === null && (
            <PrimeToolsCommandCenter
              stats={{
                agentsOnline: onlineAgents,
                agentsTotal: totalAgents,
                rulesCount: routingRulesCount,
                memoriesCount: memoryCount,
                connectorsConnected: connectedApps,
                connectorsTotal: totalApps,
                lastSystemCheck: lastCheckLabel,
              }}
              onViewTeam={() => {
                setActivePrimePanel("team");
                setMenuOpen(false);
              }}
              onOpenTasks={() => {
                setMenuOpen(false);
                onOpenTasks?.();
              }}
              onOpenSystemStatus={() => {
                // Refresh stats
                primeStats.refetch();
                activityFeed.refetch();
                // Could open a status panel in the future
              }}
              onOpenPrimeSettings={() => {
                setActivePrimePanel("settings");
                setMenuOpen(false);
              }}
              onOpenMemoryCenter={() => {
                setActivePrimePanel("memory");
                setMenuOpen(false);
              }}
              onOpenIntegrations={() => {
                setActivePrimePanel("integrations");
                setMenuOpen(false);
              }}
            />
          )}

          {/* Floating button */}
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 text-sm font-semibold shadow-lg shadow-amber-500/40 px-4 py-2 border border-amber-300/70 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-amber-600 text-xs font-bold">
              👑
            </span>
            <span>Prime Tools</span>
          </button>
        </div>
      </div>

      {/* Right-side slideout panels */}
      <PrimeRightPanel
        title={
          activePrimePanel === "team"
            ? "AI Team Status"
            : activePrimePanel === "settings"
            ? "Prime Settings"
            : activePrimePanel === "memory"
            ? "Prime Memory Center"
            : activePrimePanel === "integrations"
            ? "Tools & Integrations"
            : ""
        }
        description={
          activePrimePanel === "team"
            ? "See which employees are online and what they're working on."
            : activePrimePanel === "settings"
            ? "Tune how Prime behaves as your AI CEO."
            : activePrimePanel === "memory"
            ? "Review and manage what Prime remembers about you."
            : activePrimePanel === "integrations"
            ? "Manage the data sources and tools Prime can use."
            : undefined
        }
        open={activePrimePanel !== null}
        onClose={handleCloseAll}
        panelId={activePrimePanel ?? undefined}
        onPanelChange={(id) => setActivePrimePanel(id)}
        panelRef={panelRef}
      >
        {activePrimePanel === "team" && <PrimeTeamStatusPanel />}
        {activePrimePanel === "settings" && <PrimeSettingsPanel />}
        {activePrimePanel === "memory" && <PrimeMemoryCenterPanel />}
        {activePrimePanel === "integrations" && <PrimeToolsIntegrationsPanel />}
      </PrimeRightPanel>
    </>
  );
};

