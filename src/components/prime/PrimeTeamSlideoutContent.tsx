import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";



type EmployeeStatus = "online" | "idle" | "busy" | "offline";



export type PrimeEmployee = {

  id: string;

  name: string;

  role: string;

  status: EmployeeStatus;

  lastActive: string; // e.g. "12 min ago"

  tasksToday?: number;

};



type PrimeTeamSlideoutContentProps = {

  employees: PrimeEmployee[];

  activeFilter: "all" | EmployeeStatus;

  onFilterChange: (filter: "all" | EmployeeStatus) => void;

  onClose?: () => void;

  onEmployeeClick?: (employee: PrimeEmployee) => void;

};



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



export function PrimeTeamSlideoutContent({

  employees,

  activeFilter,

  onFilterChange,

  onClose,

  onEmployeeClick,

}: PrimeTeamSlideoutContentProps) {

  const filtered =

    activeFilter === "all"

      ? employees

      : employees.filter((e) => e.status === activeFilter);



  const onlineCount = employees.filter((e) => e.status === "online").length;

  const busyCount = employees.filter((e) => e.status === "busy").length;

  const idleCount = employees.filter((e) => e.status === "idle").length;

  const offlineCount = employees.filter((e) => e.status === "offline").length;



  return (

    // This wrapper is what gives the "floating framed card" feeling

    <div className="flex h-full justify-end">

      <motion.aside

        initial={{ opacity: 0, x: 24 }}

        animate={{ opacity: 1, x: 0 }}

        exit={{ opacity: 0, x: 24 }}

        className="

          my-6 mr-4 flex h-[calc(100vh-3rem)] w-full max-w-xl flex-col

          rounded-3xl border border-slate-800/80 bg-gradient-to-b

          from-slate-900/80 via-slate-950 to-slate-950

          shadow-[0_0_0_1px_rgba(15,23,42,0.9),-18px_0_40px_rgba(56,189,248,0.25)]

          overflow-hidden

        "

      >

        {/* HEADER – sticky */}

        <div className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/90 px-6 pt-5 pb-4 backdrop-blur-sm">

          <div className="flex items-start justify-between gap-3">

            <div className="flex-1">

              <div className="flex items-center gap-2">

                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-sm">

                  👑

                </span>

                <h2 className="text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase">

                  Prime Team

                </h2>

              </div>

              <p className="mt-1 text-base font-semibold text-slate-50">

                AI Employees · <span className="text-emerald-400">Live</span>

              </p>

              <p className="mt-1 text-xs text-slate-400">

                See who&apos;s online, what they&apos;re working on, and jump

                into any workspace.

              </p>

            </div>



            {/* Close button and heatmap */}

            <div className="flex flex-col items-end gap-2">

              {onClose && (

                <button

                  onClick={onClose}

                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors"

                  aria-label="Close panel"

                >

                  ✕

                </button>

              )}



              {/* Tiny heatmap */}

              <div className="flex flex-col items-end gap-1">

              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">

                Live Heatmap

              </p>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">

                <span className="flex items-center gap-1">

                  <span className="h-1.5 w-3 rounded-full bg-emerald-400/90 animate-pulse" />

                  {onlineCount} online

                </span>

                <span className="flex items-center gap-1 text-amber-300/90">

                  <span className="h-1.5 w-3 rounded-full bg-amber-400/80" />

                  {busyCount} busy

                </span>

                <span className="flex items-center gap-1 text-slate-400">

                  <span className="h-1.5 w-3 rounded-full bg-slate-500/90" />

                  {idleCount} idle

                </span>

                <span className="flex items-center gap-1 text-slate-500">

                  <span className="h-1.5 w-3 rounded-full bg-slate-700" />

                  {offlineCount}

                </span>

              </div>

              </div>

            </div>

          </div>



          {/* Filters */}

          <div className="mt-4 flex flex-wrap gap-2">

            {[

              { id: "all", label: "All" },

              { id: "online", label: "Active" },

              { id: "idle", label: "Idle" },

              { id: "busy", label: "Busy" },

            ].map((f) => (

              <button

                key={f.id}

                type="button"

                onClick={() =>

                  onFilterChange(f.id as "all" | EmployeeStatus)

                }

                className={[

                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",

                  activeFilter === f.id

                    ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"

                    : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:bg-slate-900",

                ].join(" ")}

              >

                {f.label}

              </button>

            ))}

          </div>

        </div>



        {/* SCROLL AREA */}

        <div className="flex-1 overflow-y-auto px-6 py-4">

          <motion.div

            variants={containerVariants}

            initial="hidden"

            animate="show"

            className="grid gap-4 md:grid-cols-2"

          >

            {filtered.map((employee) => (

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

                    Jump into workspace or let Prime assign tasks

                    automatically.

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



          {filtered.length === 0 && (

            <div className="mt-10 flex flex-col items-center justify-center text-center text-sm text-slate-400">

              <p>No employees match this filter right now.</p>

              <p className="mt-1 text-xs text-slate-500">

                Try switching to &quot;All&quot; or &quot;Active&quot;.

              </p>

            </div>

          )}

        </div>



        {/* FOOTER – sticky command bar */}

        <div className="sticky bottom-0 z-20 border-t border-slate-800/80 bg-slate-950/95 px-6 py-3 backdrop-blur-sm">

          <div className="flex items-center gap-3">

            <Input

              placeholder="Search your AI team..."

              className="h-9 rounded-full border-slate-700 bg-slate-900/80 text-xs placeholder:text-slate-500"

            />

            <Button

              variant="outline"

              className="h-9 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300"

            >

              🔁 Refresh

            </Button>

            <Button className="h-9 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-sky-500 text-xs font-semibold text-slate-950 shadow-[0_8px_25px_rgba(34,197,94,0.45)] hover:brightness-110">

              ✨ AI Team Actions

            </Button>

          </div>

        </div>

      </motion.aside>

    </div>

  );

}

