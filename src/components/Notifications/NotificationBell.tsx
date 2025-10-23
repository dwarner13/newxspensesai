import { useEffect, useMemo, useRef, useState } from "react";

/** Match your normalized employee slugs */
type Employee = "prime-boss" | "byte-docs" | "crystal-analytics" | "tag-ai" | "ledger-tax" | "goalie-agent";

type Priority = "critical" | "action" | "info" | "success";

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  createdAt: string; // ISO
  employee: Employee;
  priority: Priority;
  read?: boolean;
  /** optional deep-link (e.g., /transactions?needsReview=true) */
  href?: string;
  /** optional action payload Prime can use */
  payload?: Record<string, any>;
};

type Props = {
  /** Feed in what you already have */
  items: NotificationItem[];
  /** Upstream handlers you already use */
  onMarkAllRead?: () => Promise<void> | void;
  onMarkRead?: (id: string) => Promise<void> | void;
  /** Optional: refetch after actions */
  onRefresh?: () => Promise<void> | void;
};

/** small helpers for badges/icons that fit your existing style */
const priorityDot: Record<Priority, string> = {
  critical: "bg-red-500",
  action: "bg-yellow-400",
  info: "bg-blue-400",
  success: "bg-emerald-500",
};

const employeeLabel: Record<Employee, string> = {
  "byte-docs": "Byte",
  "crystal-analytics": "Crystal",
  "tag-ai": "Tag",
  "prime-boss": "Prime",
  "ledger-tax": "Ledger",
  "goalie-agent": "Goalie",
};

const employeeChip: Record<Employee, string> = {
  "byte-docs": "bg-sky-900/40 text-sky-200 border border-sky-700/40",
  "crystal-analytics": "bg-fuchsia-900/40 text-fuchsia-200 border border-fuchsia-700/40",
  "tag-ai": "bg-emerald-900/40 text-emerald-200 border border-emerald-700/40",
  "prime-boss": "bg-amber-900/40 text-amber-200 border border-amber-700/40",
  "ledger-tax": "bg-purple-900/40 text-purple-200 border border-purple-700/40",
  "goalie-agent": "bg-rose-900/40 text-rose-200 border border-rose-700/40",
};

/** Click-away hook */
function useClickAway(cb: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [cb]);
  return ref;
}

export default function NotificationBell({
  items,
  onMarkAllRead,
  onMarkRead,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const ref = useClickAway(() => setOpen(false));

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const grouped = useMemo(() => {
    const buckets = {
      action: [] as NotificationItem[],
      critical: [] as NotificationItem[],
      info: [] as NotificationItem[],
      success: [] as NotificationItem[],
    };
    for (const n of items) {
      buckets[n.priority].push(n);
    }
    // newest first
    (Object.keys(buckets) as (keyof typeof buckets)[]).forEach((k) =>
      buckets[k].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    );
    return buckets;
  }, [items]);

  /** "Have Prime handle it" — sends a single summarized command to your chat endpoint */
  async function handleWithPrime() {
    try {
      setProcessing(true);
      const actionable = items.filter(
        (n) => !n.read && (n.priority === "action" || n.priority === "critical")
      );
      if (actionable.length === 0) {
        setOpen(false);
        return;
      }

      const summary = actionable
        .map(
          (n) =>
            `• [${employeeLabel[n.employee]}] ${n.title}${
              n.payload ? ` (payload=${JSON.stringify(n.payload)})` : ""
            }`
        )
        .join("\n");

      const session = await (window as any).__authSession?.();
      const token = session?.access_token;

      if (!token) {
        console.error("No auth token available");
        return;
      }

      await fetch("/.netlify/functions/notifications/have-prime-handle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          notificationIds: actionable.map((n) => n.id),
        }),
      });

      if (onRefresh) await onRefresh();
      setOpen(false);
    } catch (e) {
      console.error("Prime handle error", e);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button – keep your existing icon; wrapper preserves your styles */}
      <button
        aria-label="Notifications"
        onClick={() => setOpen((s) => !s)}
        className="relative inline-flex items-center justify-center rounded-xl p-2 hover:bg-white/5 transition"
      >
        {/* replace with your bell icon component if you have one */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white/90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.97 8.97 0 0019.5 9.75v-.3a6.75 6.75 0 10-13.5 0v.3A8.97 8.97 0 003.69 15.77c1.76.64 3.61 1.08 5.454 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-500 text-[11px] font-semibold text-white flex items-center justify-center shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-3 w-[380px] max-h-[80vh] overflow-auto rounded-2xl bg-slate-900/95 backdrop-blur border border-white/10 shadow-xl p-3"
          style={{ zIndex: 60 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="text-sm font-semibold text-white/90">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-white/60">({unreadCount} new)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleWithPrime}
                disabled={processing || items.filter(n => !n.read && (n.priority === "action" || n.priority === "critical")).length === 0}
                className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/25 border border-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "Processing..." : "Have Prime handle it"}
              </button>
              <button
                onClick={() => onMarkAllRead?.()}
                className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/80 hover:bg-white/10"
              >
                Mark all read
              </button>
            </div>
          </div>

          {/* Critical / Action first */}
          {grouped.critical.length > 0 && (
            <Section title="Needs Attention" items={grouped.critical} onMarkRead={onMarkRead} />
          )}
          {grouped.action.length > 0 && (
            <Section title="Action Items" items={grouped.action} onMarkRead={onMarkRead} />
          )}

          {/* Info / Success */}
          {grouped.info.length > 0 && (
            <Section title="Activity & Insights" items={grouped.info} onMarkRead={onMarkRead} />
          )}
          {grouped.success.length > 0 && (
            <Section title="Completed" items={grouped.success} onMarkRead={onMarkRead} />
          )}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="px-2 py-6 text-center text-white/60 text-sm">
              You're all caught up. 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onMarkRead,
}: {
  title: string;
  items: NotificationItem[];
  onMarkRead?: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-white/50">{title}</div>
      <ul className="space-y-1">
        {items.map((n) => (
          <li
            key={n.id}
            className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.04] border border-white/5"
          >
            <span className={`mt-1 h-2 w-2 rounded-full ${priorityDot[n.priority]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${employeeChip[n.employee]}`}>
                  {employeeLabel[n.employee]}
                </span>
                {!n.read && <span className="text-[10px] text-white/50">• new</span>}
              </div>
              <div className="text-sm text-white/90">{n.title}</div>
              {n.description && (
                <div className="text-xs text-white/60 mt-0.5 line-clamp-2">{n.description}</div>
              )}
              <div className="mt-2 flex items-center gap-2">
                {n.href && (
                  <a
                    href={n.href}
                    className="text-xs text-blue-300 hover:text-blue-200 underline underline-offset-2"
                  >
                    Open
                  </a>
                )}
                <button
                  onClick={() => onMarkRead?.(n.id)}
                  className="text-xs text-white/60 hover:text-white/80"
                >
                  Mark read
                </button>
                <span className="ml-auto text-[10px] text-white/40">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}





