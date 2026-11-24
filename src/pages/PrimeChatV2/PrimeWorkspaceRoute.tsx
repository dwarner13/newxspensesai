import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { isPrimeBriefingOpenAtom, primeChatModeAtom } from "@/lib/uiStore";

/**
 * UX-P2b — /dashboard/chat/prime opens the existing, single mounted Prime chat in Workspace
 * mode (full page). It renders no chat of its own: it only sets the mode and opens the
 * panel. It reads no ids from the URL and loads nothing.
 *
 * DashboardLayout closes Prime on every route change, and a child route's effects run
 * before the layout's. So the open is deferred one animation frame, after that close has
 * run (the same ordering idea as the layout's returnToConversation reopen). The frame is
 * cancelled on unmount, so a fast navigation away never opens Prime on another page.
 */
export default function PrimeWorkspaceRoute() {
  const isOpen = useAtomValue(isPrimeBriefingOpenAtom);
  const setOpen = useSetAtom(isPrimeBriefingOpenAtom);
  const setMode = useSetAtom(primeChatModeAtom);
  const navigate = useNavigate();
  const openedRef = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMode("workspace");
      setOpen(true);
      openedRef.current = true;
    });
    return () => {
      cancelAnimationFrame(frame);
      // Leaving the Workspace route never leaves Workspace mode behind for the global Ask Prime.
      setMode((m) => (m === "workspace" ? "quick" : m));
    };
  }, [setMode, setOpen]);

  // Closing Prime while in Workspace returns to the dashboard.
  useEffect(() => {
    if (openedRef.current && !isOpen) {
      setMode("quick");
      navigate("/dashboard", { replace: true });
    }
  }, [isOpen, navigate, setMode]);

  return <div aria-hidden="true" style={{ minHeight: "100%" }} />;
}
