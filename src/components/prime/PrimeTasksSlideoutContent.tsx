import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";



type TaskStatus = "completed" | "in_progress" | "failed" | "queued";



export type PrimeTask = {

  id: string;

  title: string;

  description: string;

  status: TaskStatus;

  employeeName: string;

  employeeRole: string;

  ago: string;         // "5 min ago"

};



type PrimeTasksSlideoutContentProps = {

  tasks: PrimeTask[];

  activeFilter: "all" | TaskStatus;

  onFilterChange: (filter: "all" | TaskStatus) => void;

  onClose?: () => void;

  onTaskClick?: (task: PrimeTask) => void;

  onClearCompleted?: () => void;

  onPauseQueue?: () => void;

};



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



function statusLabel(status: TaskStatus) {

  switch (status) {

    case "completed":

      return "Completed";

    case "in_progress":

      return "In progress";

    case "failed":

      return "Failed";

    case "queued":

      return "Queued";

  }

}



function statusClasses(status: TaskStatus) {

  switch (status) {

    case "completed":

      return "bg-emerald-500/10 text-emerald-300 border-emerald-400/60";

    case "in_progress":

      return "bg-sky-500/10 text-sky-300 border-sky-400/60";

    case "failed":

      return "bg-rose-500/10 text-rose-300 border-rose-400/60";

    case "queued":

      return "bg-amber-500/10 text-amber-300 border-amber-400/60";

  }

}



export function PrimeTasksSlideoutContent({

  tasks,

  activeFilter,

  onFilterChange,

  onClose,

  onTaskClick,

  onClearCompleted,

  onPauseQueue,

}: PrimeTasksSlideoutContentProps) {

  const filtered =

    activeFilter === "all"

      ? tasks

      : tasks.filter((t) => t.status === activeFilter);



  const completed = tasks.filter((t) => t.status === "completed").length;

  const inProgress = tasks.filter((t) => t.status === "in_progress").length;

  const failed = tasks.filter((t) => t.status === "failed").length;

  const queued = tasks.filter((t) => t.status === "queued").length;

  const total = tasks.length || 1;

  const completionPct = Math.round((completed / total) * 100);



  return (

    <div className="flex h-full justify-end">

      <motion.aside

        initial={{ opacity: 0, x: 24 }}

        animate={{ opacity: 1, x: 0 }}

        exit={{ opacity: 0, x: 24 }}

        className="

          my-6 mr-24 flex h-[calc(100vh-3rem)] w-full max-w-xl flex-col

          overflow-hidden rounded-3xl border border-slate-800/80

          bg-gradient-to-b from-slate-900/85 via-slate-950 to-slate-950

          max-lg:mr-4

          shadow-[0_0_0_1px_rgba(15,23,42,0.9),-18px_0_40px_rgba(59,130,246,0.35)]

        "

      >

        {/* HEADER */}

        <div className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/90 px-6 pt-5 pb-4 backdrop-blur-sm">

          <div className="flex items-start justify-between gap-3">

            <div className="flex-1">

              <div className="flex items-center gap-2">

                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-sm">

                  ⚡

                </span>

                <h2 className="text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase">

                  Prime Tasks

                </h2>

              </div>

              <p className="mt-1 text-base font-semibold text-slate-50">

                Command Queue

              </p>

              <p className="mt-1 text-xs text-slate-400">

                See everything Prime has routed and what is in progress.

              </p>

            </div>



            {/* Close button and progress chip */}

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



              {/* Progress chip */}

              <div className="flex flex-col items-end gap-1">

                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">

                  Queue Health

                </p>

                <div className="flex items-center gap-2 text-xs text-slate-200">

                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">

                    {completionPct}% complete

                  </span>

                </div>

                <div className="mt-1 flex w-40 overflow-hidden rounded-full bg-slate-800/80">

                  <div

                    className="h-1.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-slate-500 transition-[width]"

                    style={{ width: `${completionPct}%` }}

                  />

                </div>

              </div>

            </div>

          </div>



          {/* Filter pills */}

          <div className="mt-4 flex flex-wrap gap-2 text-xs">

            {[

              { id: "all", label: "All", count: total },

              { id: "completed", label: "Completed", count: completed },

              { id: "in_progress", label: "In Progress", count: inProgress },

              { id: "failed", label: "Failed", count: failed },

              { id: "queued", label: "Queued", count: queued },

            ].map((f) => (

              <button

                key={f.id}

                type="button"

                onClick={() =>

                  onFilterChange(

                    f.id as "all" | "completed" | "failed" | "queued" | "in_progress"

                  )

                }

                className={[

                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",

                  activeFilter === f.id

                    ? "border-sky-400/80 bg-sky-500/10 text-sky-200"

                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-900",

                ].join(" ")}

              >

                <span>{f.label}</span>

                <span className="text-[10px] text-slate-400">({f.count})</span>

              </button>

            ))}

          </div>

        </div>



        {/* TIMELINE + TASK CARDS */}

        <ScrollArea className="flex-1 px-6 py-4">

          <motion.div

            variants={listVariants}

            initial="hidden"

            animate="show"

            className="relative pl-4"

          >

            {/* vertical timeline line */}

            <div className="pointer-events-none absolute left-[6px] top-0 h-full w-px bg-gradient-to-b from-sky-400/60 via-slate-700 to-transparent" />



            {filtered.map((task, idx) => (

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

                      className={[

                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",

                        statusClasses(task.status),

                      ].join(" ")}

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



            {filtered.length === 0 && (

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



        {/* FOOTER COMMAND BAR */}

        <div className="sticky bottom-0 z-20 border-t border-slate-800/80 bg-slate-950/95 px-6 py-3 backdrop-blur-sm">

          <div className="flex items-center justify-between gap-3 text-xs">

            <p className="text-slate-400">

              Prime keeps a rolling log of your AI activity and automations.

            </p>

            <div className="flex items-center gap-2">

              <Button

                variant="outline"

                className="h-8 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-200"

                onClick={onClearCompleted}

              >

                🧹 Clear completed

              </Button>

              <Button 

                className="h-8 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 text-xs font-semibold text-slate-950 shadow-[0_10px_28px_rgba(59,130,246,0.6)] hover:brightness-110"

                onClick={onPauseQueue}

              >

                ⚡ Pause queue

              </Button>

            </div>

          </div>

        </div>

      </motion.aside>

    </div>

  );

}

