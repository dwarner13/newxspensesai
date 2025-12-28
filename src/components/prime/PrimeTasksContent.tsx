/**
 * PrimeTasksContent Component
 * 
 * Content-only version for use inside PrimeSlideoutShell
 * Displays task timeline with cards
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PrimeTask } from "./PrimeTasksSlideoutContent";

const listVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In progress";
    case "failed":
      return "Failed";
    case "queued":
      return "Queued";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-400/60";
    case "in_progress":
      return "bg-sky-500/10 text-sky-300 border-sky-400/60";
    case "failed":
      return "bg-rose-500/10 text-rose-300 border-rose-400/60";
    case "queued":
      return "bg-amber-500/10 text-amber-300 border-amber-400/60";
    default:
      return "bg-slate-500/10 text-slate-300 border-slate-400/60";
  }
}

interface PrimeTasksContentProps {
  tasks: PrimeTask[];
  onTaskClick?: (task: PrimeTask) => void;
}

export function PrimeTasksContent({
  tasks,
  onTaskClick,
}: PrimeTasksContentProps) {
  return (
    <ScrollArea className="flex-1 px-6 py-4">
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="relative pl-4"
      >
        {/* vertical timeline line */}
        <div className="pointer-events-none absolute left-[6px] top-0 h-full w-px bg-gradient-to-b from-sky-400/60 via-slate-700 to-transparent" />

        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            variants={itemVariants}
            className="relative mb-4 last:mb-2"
          >
            {/* timeline dot */}
            <div className="absolute -left-[11px] top-4 flex h-4 w-4 items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-slate-900 ring-2 ring-sky-500/80" />
              {task.status === "in_progress" && (
                <div className="absolute h-4 w-4 animate-ping rounded-full bg-sky-500/40" />
              )}
            </div>

            {/* Card */}
            <div className="group overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-sky-400/70 hover:shadow-[0_20px_40px_rgba(56,189,248,0.45)]">
              {/* status strip */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-xs text-slate-300">
                    {task.employeeName} · {task.employeeRole}
                  </span>
                  <span className="text-slate-500">• {task.ago}</span>
                </div>

                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClasses(task.status)}`}
                >
                  {statusLabel(task.status)}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-50">
                {task.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {task.description}
              </p>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <p>
                  Prime routed this task automatically based on your recent
                  uploads and goals.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full border-slate-600 bg-slate-900/80 px-3 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-200"
                  onClick={() => onTaskClick?.(task)}
                >
                  View details
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        {tasks.length === 0 && (
          <div className="mt-10 text-center text-sm text-slate-400">
            No tasks in this view right now.
            <p className="mt-1 text-xs text-slate-500">
              Try switching filters or upload new documents to create work
              for your AI team.
            </p>
          </div>
        )}
      </motion.div>
    </ScrollArea>
  );
}


