import { useMobileRevolution } from "../../hooks/useMobileRevolution";
import MobileDebugPanel from "../../components/dev/MobileDebugPanel";

export default function MobileCheck() {
  const data = useMobileRevolution();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Mobile Check</h1>
      <pre className="bg-zinc-900 text-green-400 text-xs p-4 rounded-xl">{JSON.stringify(data, null, 2)}</pre>
      <MobileDebugPanel data={data}/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 p-3">
          <h2 className="font-medium mb-2">Mobile Component</h2>
          <div className="block md:hidden">VISIBLE under md</div>
          <div className="hidden md:block opacity-40">Hidden on desktop</div>
        </div>
        <div className="rounded-xl border border-zinc-800 p-3">
          <h2 className="font-medium mb-2">Desktop Component</h2>
          <div className="hidden md:block">VISIBLE md and up</div>
          <div className="block md:hidden opacity-40">Hidden on mobile</div>
        </div>
      </div>
    </div>
  );
}


