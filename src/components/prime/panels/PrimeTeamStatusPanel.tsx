import React from "react";
import { motion } from "framer-motion";
import { usePrimeLiveStats } from "../../../hooks/usePrimeLiveStats";
import { EMPLOYEES } from "../../../data/aiEmployees";
import { Button } from "../../../components/ui/button";
import { Users, Settings, Brain, Shield, RefreshCw, PlugZap } from "lucide-react";

export type PrimeStatusView = "team" | "system" | "settings" | "memory" | "tools";

export type PrimeTeamStatusPanelProps = {
  initialView?: PrimeStatusView;
  onClose?: () => void;
};

const tileVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function PrimeTeamStatusPanel({ initialView, onClose }: PrimeTeamStatusPanelProps) {
  const { data: stats, isLoading, refetch } = usePrimeLiveStats();
  const [view, setView] = React.useState<PrimeStatusView>(initialView ?? "team");

  React.useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  const totalAgents = stats?.totalEmployees ?? EMPLOYEES.length;
  const onlineAgents = stats?.onlineEmployees ?? 0;
  const liveTasks = stats?.liveTasks ?? 0;
  const successRate = stats?.successRate ?? 0;

  return (
    <div className="flex h-full justify-end items-center">
      <aside
        className="
          my-6 mr-24 flex h-[calc(100vh-3rem)] w-full max-w-3xl
          flex-col overflow-hidden rounded-3xl
          border border-slate-800/80 bg-slate-950/95
          shadow-[0_0_0_1px_rgba(15,23,42,0.85),-24px_0_70px_rgba(15,23,42,0.9)]
          max-lg:mr-4
        "
      >
        {/* HEADER: sticky title + tabs + three metric cards */}
        <div className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/95 px-6 pt-5 pb-4 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">AI Team Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                See which employees are online and what they're working on.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-800 text-slate-300"
                aria-label="Close panel"
              >
                ✕
              </button>
            )}
          </div>

          {/* Top tabs */}
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 p-1 mb-4">
            {[
              { id: "team" as PrimeStatusView, label: "Team", icon: Users },
              { id: "system" as PrimeStatusView, label: "System", icon: Shield },
              { id: "settings" as PrimeStatusView, label: "Settings", icon: Settings },
              { id: "memory" as PrimeStatusView, label: "Memory", icon: Brain },
              { id: "tools" as PrimeStatusView, label: "Tools", icon: PlugZap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-full transition-colors ${
                    view === tab.id
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Stats row - always visible */}
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="text-slate-400 mb-1">AI Agents</div>
              <div className="text-lg font-semibold text-slate-50">
                {isLoading ? "..." : `${onlineAgents}/${totalAgents}`}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">Online right now</div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="text-slate-400 mb-1">Live Tasks</div>
              <div className="text-lg font-semibold text-slate-50">
                {isLoading ? "..." : liveTasks}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">In progress</div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="text-slate-400 mb-1">Success Rate</div>
              <div className="text-lg font-semibold text-slate-50">
                {isLoading ? "--" : `${(successRate * 100).toFixed(1)}%`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Last 24 hrs</div>
            </div>
          </div>
        </div>

        {/* CONTENT: scroll area for all views */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="mx-auto max-w-5xl space-y-5">
            {view === "team" && <PrimeStatusTeamView employees={EMPLOYEES} stats={stats} isLoading={isLoading} />}
            {view === "system" && <PrimeStatusSystemView onRunCheck={refetch} lastCheck={stats?.lastCheck} />}
            {view === "settings" && <PrimeStatusSettingsView />}
            {view === "memory" && <PrimeStatusMemoryView />}
            {view === "tools" && (
              <PrimeStatusToolsView
                onOpenSystem={() => setView("system")}
                onOpenSettings={() => setView("settings")}
                onOpenMemory={() => setView("memory")}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// View Components

function PrimeStatusTeamView({ employees, stats, isLoading }: any) {
  const featured = employees.slice(0, 3);
  const rest = employees.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Section 1: Featured row */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Featured today
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {featured.map((emp: any) => {
            const employeeStatus = stats?.employees?.find(
              (e: any) => e.slug === emp.key || e.slug.includes(emp.key)
            );
            const online = employeeStatus?.status === 'online';
            const idle = employeeStatus?.status === 'idle';
            const statusDisplay = online ? 'Online' : idle ? 'Idle' : 'Offline';

            return (
              <div
                key={emp.key}
                className="
                  group h-full rounded-2xl border border-slate-800/80
                  bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]
                  transition hover:-translate-y-1 hover:border-emerald-400/70
                  hover:shadow-[0_24px_60px_rgba(16,185,129,0.55)]
                "
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xl">
                      {emp.emoji || '🤖'}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        online
                          ? "bg-emerald-400"
                          : idle
                          ? "bg-amber-400"
                          : "bg-slate-700"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-50 truncate">
                      {emp.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {emp.short}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-emerald-300">
                  {statusDisplay} · Open workspace
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: All employees list – compact */}
      {rest.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            All employees
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {rest.map((emp: any) => {
              const employeeStatus = stats?.employees?.find(
                (e: any) => e.slug === emp.key || e.slug.includes(emp.key)
              );
              const online = employeeStatus?.status === 'online';
              const idle = employeeStatus?.status === 'idle';
              const statusDisplay = online ? 'Online' : idle ? 'Idle' : 'Offline';

              return (
                <div
                  key={emp.key}
                  className="
                    flex items-center justify-between rounded-xl
                    border border-slate-800/80 bg-slate-900/70 px-3 py-2.5
                    hover:border-sky-400/70 hover:bg-slate-900/90
                    transition
                  "
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base flex-shrink-0">{emp.emoji || '🤖'}</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-50 truncate">
                        {emp.name}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {emp.short}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] flex-shrink-0 ml-2 ${
                      online
                        ? "text-emerald-400"
                        : idle
                        ? "text-amber-400"
                        : "text-slate-500"
                    }`}
                  >
                    {statusDisplay}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function PrimeStatusSystemView({ onRunCheck, lastCheck }: { onRunCheck?: () => void; lastCheck?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200">System Health</h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-sky-400 hover:text-sky-200"
          onClick={onRunCheck}
        >
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Run system check
        </Button>
      </div>

      {/* Stat boxes */}
      <div className="grid gap-3 md:grid-cols-3">
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-50">Guardrails</span>
          </div>
          <p className="text-lg font-bold text-emerald-300">Active</p>
          <p className="text-[11px] text-slate-400 mt-1">All systems operational</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-xs font-semibold text-slate-50">Rate Limits</span>
          </div>
          <p className="text-lg font-bold text-sky-300">OK</p>
          <p className="text-[11px] text-slate-400 mt-1">Within normal range</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs font-semibold text-slate-50 mb-2">Last Incident</div>
          <p className="text-lg font-bold text-slate-200">None</p>
          <p className="text-[11px] text-slate-400 mt-1">In 24 hrs</p>
        </motion.div>
      </div>

      {/* Detail cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <h4 className="text-xs font-semibold text-slate-50 mb-3">Guardrails Status</h4>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Jailbreak detection</span>
              <span className="text-emerald-400">✓ Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Content filters</span>
              <span className="text-emerald-400">✓ Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">PII masking</span>
              <span className="text-emerald-400">✓ Active</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <h4 className="text-xs font-semibold text-slate-50 mb-3">Routing Pipeline</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Prime analyzes incoming requests and routes them to specialized AI employees based on context, 
            intent, and workload. Each employee has access to specific tools and data sources.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PrimeStatusSettingsView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Top stat cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs text-slate-400 mb-1">Tone Profile</div>
          <div className="text-sm font-semibold text-indigo-300">Supportive · Direct</div>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs text-slate-400 mb-1">Active Rules</div>
          <div className="text-sm font-semibold text-indigo-300">4</div>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs text-slate-400 mb-1">Default Routing</div>
          <div className="text-sm font-semibold text-indigo-300">Auto</div>
        </motion.div>
      </div>

      {/* Secondary sections */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Tone Preview */}
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <h4 className="text-xs font-semibold text-slate-50 mb-3">Tone Preview</h4>
          <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              "I'll help you analyze that transaction. Let me check with Byte to get the latest import data, 
              then we can review your spending patterns together."
            </p>
          </div>
        </motion.div>

        {/* Routing Priorities */}
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <h4 className="text-xs font-semibold text-slate-50 mb-3">Routing Priorities</h4>
          <div className="flex flex-wrap gap-2">
            {[
              "Imports → Byte",
              "Categories → Tag",
              "Goals → Goalie",
              "Debt → Blitz",
              "Analytics → Crystal",
            ].map((route) => (
              <span
                key={route}
                className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 text-[11px] text-indigo-300"
              >
                {route}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Toggles */}
      <motion.div
        variants={tileVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
      >
        <h4 className="text-xs font-semibold text-slate-50 mb-3">Communication Style</h4>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-slate-300">Explain in detail</span>
            <input type="checkbox" className="rounded" defaultChecked />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-slate-300">Be brief</span>
            <input type="checkbox" className="rounded" />
          </label>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PrimeStatusMemoryView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Stat row */}
      <div className="grid gap-3 md:grid-cols-3">
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs text-slate-400 mb-1">Total Memories</div>
          <div className="text-lg font-semibold text-amber-300">0</div>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs text-slate-400 mb-1">Vendors</div>
          <div className="text-lg font-semibold text-teal-300">0</div>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <div className="text-xs text-slate-400 mb-1">Goals</div>
          <div className="text-lg font-semibold text-teal-300">0</div>
        </motion.div>
      </div>

      {/* Secondary sections */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Recent memories */}
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <h4 className="text-xs font-semibold text-slate-50 mb-3 flex items-center gap-2">
            <span className="text-base">🧠</span>
            Recent memories added
          </h4>
          <div className="space-y-2 text-[11px] text-slate-400">
            <p>No memories yet. Prime will remember important details as you chat.</p>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.9)]"
        >
          <h4 className="text-xs font-semibold text-slate-50 mb-3">Controls</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-200"
            >
              Open Memory Center
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-slate-500"
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-rose-400 hover:text-rose-200"
            >
              Clear all
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

type PrimeStatusToolsViewProps = {
  onOpenSystem: () => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
};

const toolsTileVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function PrimeStatusToolsView({
  onOpenSystem,
  onOpenSettings,
  onOpenMemory,
}: PrimeStatusToolsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <p className="text-xs text-slate-400">
        Deep tools for Prime. Use these to inspect routing, tune tone, and
        manage data sources.
      </p>

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05, delayChildren: 0.03 }}
        className="grid gap-3 md:grid-cols-3"
      >
        {/* System Status */}
        <motion.button
          type="button"
          variants={toolsTileVariants}
          onClick={onOpenSystem}
          className="
            group flex flex-col items-start rounded-2xl border border-slate-800/80
            bg-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.9)]
            transition hover:-translate-y-1 hover:border-sky-400/70
            hover:shadow-[0_24px_60px_rgba(56,189,248,0.55)]
          "
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-sky-500/60">
            <span className="text-base">🛡️</span>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-50">
            System Status
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Routing, guardrails &amp; rate limits.
          </p>
        </motion.button>

        {/* Prime Settings */}
        <motion.button
          type="button"
          variants={toolsTileVariants}
          onClick={onOpenSettings}
          className="
            group flex flex-col items-start rounded-2xl border border-slate-800/80
            bg-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.9)]
            transition hover:-translate-y-1 hover:border-indigo-400/70
            hover:shadow-[0_24px_60px_rgba(129,140,248,0.55)]
          "
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-indigo-500/60">
            <span className="text-base">⚙️</span>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-50">
            Prime Settings
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Tone, routing priorities &amp; rules.
          </p>
        </motion.button>

        {/* Memory Center */}
        <motion.button
          type="button"
          variants={toolsTileVariants}
          onClick={onOpenMemory}
          className="
            group flex flex-col items-start rounded-2xl border border-slate-800/80
            bg-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.9)]
            transition hover:-translate-y-1 hover:border-amber-400/70
            hover:shadow-[0_24px_60px_rgba(251,191,36,0.5)]
          "
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-amber-500/60">
            <span className="text-base">🧠</span>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-50">
            Memory Center
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            What Prime remembers about you.
          </p>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
