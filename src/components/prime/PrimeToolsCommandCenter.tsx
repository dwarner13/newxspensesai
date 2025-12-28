import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";



type PrimeToolsCommandCenterProps = {

  onViewTeam?: () => void;

  onOpenTasks?: () => void;

  onOpenSystemStatus?: () => void;

  onOpenPrimeSettings?: () => void;

  onOpenMemoryCenter?: () => void;

  onOpenIntegrations?: () => void;

  stats?: {

    agentsOnline?: number;

    agentsTotal?: number;

    rulesCount?: number;

    memoriesCount?: number;

    connectorsConnected?: number;

    connectorsTotal?: number;

    lastSystemCheck?: string;

  };

};



const tileVariants = {

  hidden: { opacity: 0, y: 12 },

  show: { opacity: 1, y: 0 },

};



export function PrimeToolsCommandCenter({

  onViewTeam,

  onOpenTasks,

  onOpenSystemStatus,

  onOpenPrimeSettings,

  onOpenMemoryCenter,

  onOpenIntegrations,

  stats,

}: PrimeToolsCommandCenterProps) {

  const {

    agentsOnline = 0,

    agentsTotal = 11,

    rulesCount = 4,

    memoriesCount = 0,

    connectorsConnected = 0,

    connectorsTotal = 4,

    lastSystemCheck = "Just now",

  } = stats || {};



  return (

    <motion.div

      initial={{ opacity: 0, y: 16, scale: 0.97 }}

      animate={{ opacity: 1, y: 0, scale: 1 }}

      exit={{ opacity: 0, y: 16, scale: 0.97 }}

      transition={{ type: "spring", stiffness: 260, damping: 22 }}

      className="

        fixed bottom-24 right-6 z-50

        w-full max-w-xl

        rounded-3xl border border-slate-800/80

        bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950

        shadow-[0_0_0_1px_rgba(15,23,42,0.85),0_28px_80px_rgba(15,23,42,0.95)]

        px-6 pt-5 pb-5

        overflow-hidden

      "

    >

      {/* header */}

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-lg">

              👑

            </span>

            <div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">

                Prime Tools

              </p>

              <p className="text-sm font-semibold text-slate-50">

                Quick controls for your AI team

              </p>

            </div>

          </div>

          <p className="mt-1 text-xs text-slate-400">

            See who&apos;s online, check guardrails, tune Prime&apos;s tone, and

            manage data sources in one place.

          </p>

        </div>



        <div className="flex flex-col items-end gap-2">

          <Button

            size="sm"

            className="h-7 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-sky-500 text-[11px] font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,197,94,0.55)]"

            onClick={onOpenTasks}

          >

            ⚡ Command Center

          </Button>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">

            <span className="flex items-center gap-1">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              {agentsOnline}/{agentsTotal} agents online

            </span>

            <span className="h-1 w-px bg-slate-700" />

            <span>Last system check {lastSystemCheck}</span>

          </div>

        </div>

      </div>



      {/* tiles grid */}

      <motion.div

        initial="hidden"

        animate="show"

        transition={{ staggerChildren: 0.04, delayChildren: 0.05 }}

        className="mt-4 grid gap-3 md:grid-cols-3"

      >

        {/* View Team */}

        <motion.button

          type="button"

          variants={tileVariants}

          onClick={onViewTeam}

          className="

            group flex flex-col items-start rounded-2xl border border-slate-800/90

            bg-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.9)]

            transition hover:-translate-y-1 hover:border-emerald-400/70

            hover:shadow-[0_24px_60px_rgba(16,185,129,0.55)]

          "

        >

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-emerald-500/50">

            <span className="text-base">👥</span>

          </div>

          <p className="mt-3 text-xs font-semibold text-slate-50">

            View Team

          </p>

          <p className="mt-1 text-[11px] text-slate-400">

            Who&apos;s online &amp; working right now.

          </p>

          <p className="mt-2 text-[11px] font-medium text-emerald-300">

            Agents {agentsOnline}/{agentsTotal}

          </p>

        </motion.button>



        {/* System Status */}

        <motion.button

          type="button"

          variants={tileVariants}

          onClick={onOpenSystemStatus}

          className="

            group flex flex-col items-start rounded-2xl border border-slate-800/90

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

          <p className="mt-2 text-[11px] text-sky-300">

            Last check {lastSystemCheck}

          </p>

        </motion.button>



        {/* Prime Settings */}

        <motion.button

          type="button"

          variants={tileVariants}

          onClick={onOpenPrimeSettings}

          className="

            group flex flex-col items-start rounded-2xl border border-slate-800/90

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

          <p className="mt-2 text-[11px] text-indigo-300">Rules {rulesCount}</p>

        </motion.button>



        {/* Memory Center */}

        <motion.button

          type="button"

          variants={tileVariants}

          onClick={onOpenMemoryCenter}

          className="

            group flex flex-col items-start rounded-2xl border border-slate-800/90

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

          <p className="mt-2 text-[11px] text-amber-300">

            Memories {memoriesCount}

          </p>

        </motion.button>



        {/* Integrations */}

        <motion.button

          type="button"

          variants={tileVariants}

          onClick={onOpenIntegrations}

          className="

            group flex flex-col items-start rounded-2xl border border-slate-800/90

            bg-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.9)]

            transition hover:-translate-y-1 hover:border-fuchsia-400/70

            hover:shadow-[0_24px_60px_rgba(232,121,249,0.55)]

          "

        >

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-fuchsia-500/60">

            <span className="text-base">🧬</span>

          </div>

          <p className="mt-3 text-xs font-semibold text-slate-50">

            Integrations

          </p>

          <p className="mt-1 text-[11px] text-slate-400">

            Data sources &amp; connected apps.

          </p>

          <p className="mt-2 text-[11px] text-fuchsia-300">

            Connected {connectorsConnected}/{connectorsTotal}

          </p>

        </motion.button>



        {/* Tasks shortcut (optional tile) */}

        <motion.button

          type="button"

          variants={tileVariants}

          onClick={onOpenTasks}

          className="

            group flex flex-col items-start rounded-2xl border border-slate-800/90

            bg-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.9)]

            transition hover:-translate-y-1 hover:border-sky-400/70

            hover:shadow-[0_24px_60px_rgba(56,189,248,0.55)]

          "

        >

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-sky-500/60">

            <span className="text-base">📋</span>

          </div>

          <p className="mt-3 text-xs font-semibold text-slate-50">

            Command Queue

          </p>

          <p className="mt-1 text-[11px] text-slate-400">

            See everything Prime is working on.

          </p>

          <p className="mt-2 text-[11px] text-sky-300">

            Open Prime Tasks

          </p>

        </motion.button>

      </motion.div>

    </motion.div>

  );

}

