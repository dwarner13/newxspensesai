import React, { useEffect } from "react";
import { useUnifiedChatLauncher } from "../../hooks/useUnifiedChatLauncher";

export default function CustodianPage() {
  const { openWorkerChat } = useUnifiedChatLauncher();

  useEffect(() => {
    openWorkerChat("custodian");
  }, [openWorkerChat]);

  return (
    <div className="flex items-center justify-center h-full text-slate-400">
      Opening Custodian chat…
    </div>
  );
}
