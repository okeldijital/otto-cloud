import { useEffect, useRef } from "react";
import { useOttoStore } from "../../store/ottoStore";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function formatLogData(data: any): string {
  if (typeof data === "object") {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

export function LogsViewer() {
  const { logs } = useOttoStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div ref={scrollRef} className="logs-viewer">
      {logs.length === 0 && <div className="empty">No logs yet</div>}
      {logs.map((log) => (
        <div key={log.id} className={`log log-${log.type}`}>
          <span className="timestamp">[{formatTimestamp(log.timestamp)}]</span>
          <span className="type">[{log.type.toUpperCase()}]</span>
          <span className="data">{formatLogData(log.data)}</span>
        </div>
      ))}
    </div>
  );
}