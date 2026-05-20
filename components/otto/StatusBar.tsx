import { useEffect, useState } from "react";
import { useOttoStore } from "../../store/ottoStore";

async function checkBackendStatus(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:8000/health", {
      method: "GET",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function StatusBar() {
  const [backendUp, setBackendUp] = useState(false);
  const [checking, setChecking] = useState(true);
  const { result } = useOttoStore();

  useEffect(() => {
    checkBackendStatus().then((up) => {
      setBackendUp(up);
      setChecking(false);
    });
  }, []);

  const duration = result?.meta?.duration;

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-md text-small text-text-secondary">
      <div className="flex items-center gap-xs">
        <span className="font-semibold text-text-primary">Backend:</span>
        {checking ? (
          <span className="animate-pulse">Checking...</span>
        ) : (
          <span className={`flex items-center gap-xs font-medium ${backendUp ? "text-success" : "text-danger"}`}>
            <span className="text-[10px]">●</span> {backendUp ? "Online" : "Offline"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-xs">
        <span className="font-semibold text-text-primary">Last Duration:</span>
        <span>{duration !== undefined ? `${duration}ms` : "--"}</span>
      </div>
      <div className="flex items-center gap-xs">
        <span className="font-semibold text-text-primary">Mode:</span>
        <span className="px-2 py-1 bg-surface-elevated rounded-md border border-border">sync</span>
      </div>
    </div>
  );
}