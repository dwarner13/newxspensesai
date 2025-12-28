/**
 * PrimeTeamContent Component
 * 
 * Content-only version for use inside PrimeSlideoutShell
 * Displays employee cards in a grid
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { PrimeEmployee } from "./PrimeTeamSlideoutContent";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface PrimeTeamContentProps {
  employees: PrimeEmployee[];
  onEmployeeClick?: (employee: PrimeEmployee) => void;
}

export function PrimeTeamContent({
  employees,
  onEmployeeClick,
}: PrimeTeamContentProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2"
    >
      {employees.map((employee) => (
        <motion.div
          key={employee.id}
          variants={cardVariants}
          className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.7)] transition hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-[0_20px_40px_rgba(16,185,129,0.35)]"
        >
          {/* subtle gradient halo */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-400/10 opacity-0 transition group-hover:opacity-100" />

          <div className="relative flex items-start gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-lg">
                <span>👤</span>
              </div>
              <span
                className={[
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900",
                  employee.status === "online"
                    ? "bg-emerald-400"
                    : employee.status === "busy"
                    ? "bg-amber-400"
                    : employee.status === "idle"
                    ? "bg-slate-400"
                    : "bg-slate-700",
                ].join(" ")}
              />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-50">
                {employee.name}
              </p>
              <p className="text-xs text-slate-400">{employee.role}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-300">
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      employee.status === "online"
                        ? "bg-emerald-400"
                        : employee.status === "busy"
                        ? "bg-amber-400"
                        : employee.status === "idle"
                        ? "bg-slate-400"
                        : "bg-slate-700",
                    ].join(" ")}
                  />
                  {employee.status === "online"
                    ? "Online now"
                    : employee.status === "busy"
                    ? "In a task"
                    : employee.status === "idle"
                    ? "Idle"
                    : "Offline"}
                </span>

                {typeof employee.tasksToday === "number" && (
                  <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-400">
                    {employee.tasksToday} tasks today
                  </span>
                )}

                <span className="text-slate-500">
                  Last active {employee.lastActive}
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">
              Jump into workspace or let Prime assign tasks automatically.
            </p>
            <Button
              size="sm"
              className="h-7 rounded-full px-3 text-[11px]"
              variant="secondary"
              onClick={() => onEmployeeClick?.(employee)}
            >
              Open Workspace
            </Button>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}


