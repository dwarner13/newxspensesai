import { useEffect } from 'react';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

function triggerPrimeUpload(source: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('prime:open-upload', {
      detail: { source },
    })
  );
  window.setTimeout(() => {
    const statementInputs = Array.from(
      document.querySelectorAll(
        'input[type="file"][accept*=".pdf"][accept*=".csv"][accept*=".xlsx"][accept*=".xls"]'
      )
    ) as HTMLInputElement[];
    const statementInput = statementInputs.find((input) => !input.disabled);
    statementInput?.click();
  }, 120);
}

export function SmartImportChatPage() {
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  useEffect(() => {
    // Keep this route as a lightweight compatibility page.
    // Primary upload path is Prime chat upload flow.
  }, []);

  const openPrimeUpload = () => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      force: true,
      context: {
        data: { source: 'smart-import-page', intent: 'upload' },
      },
      routeHint: '/dashboard/prime-chat',
    });
    triggerPrimeUpload('smart-import-page');
  };

  return (
    <DashboardPageShell
      center={
        <div className="p-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center backdrop-blur-md">
            <h2 className="text-2xl font-bold tracking-tight text-white">Upload Through Prime</h2>
            <p className="mt-2 text-sm text-slate-400">
              Imports are now guided through Prime chat. Byte and Tag still run automatically in the background.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={openPrimeUpload}
                className="rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/20"
              >
                Open Prime Upload
              </button>
              <button
                type="button"
                onClick={() => openChat({ initialEmployeeSlug: 'prime-boss', force: true, routeHint: '/dashboard/prime-chat' })}
                className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.03]"
              >
                Open Prime Chat
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
}
