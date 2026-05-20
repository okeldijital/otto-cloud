import { useOttoStore } from "../../store/ottoStore";

function formatOutput(data: any): string {
  if (!data) return "";
  return JSON.stringify(data, null, 2);
}

export function ExecutionPanel() {
  const { result, loading } = useOttoStore();

  if (loading) {
    return (
      <div className="panel-elevated flex items-center justify-center min-h-[300px] text-text-secondary animate-pulse">
        <div className="flex flex-col items-center gap-sm">
          <span className="text-xl">⚙️</span>
          <span>Loading execution results...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel-elevated flex items-center justify-center min-h-[300px] text-text-secondary">
        Waiting for execution...
      </div>
    );
  }

  const jobStatus = result.data?.status;
  const isSuccess = result.success;
  const duration = result.meta?.duration;
  const requestId = result.meta?.requestId;

  if (jobStatus === "pending") {
    return (
      <div className="panel-elevated flex items-center justify-center min-h-[300px] text-warning animate-pulse">
        Queued...
      </div>
    );
  }

  if (jobStatus === "running") {
    return (
      <div className="panel-elevated flex items-center justify-center min-h-[300px] text-accent animate-pulse">
        Processing...
      </div>
    );
  }

  if (jobStatus === "failed") {
    return (
      <div className="panel-elevated border-danger/50 bg-danger/5">
        <h3 className="text-h3 text-danger font-semibold mb-sm">Job Failed</h3>
        {result.data?.error && <div className="text-danger bg-danger/10 p-md rounded-md font-mono text-small">{result.data.error}</div>}
      </div>
    );
  }

  return (
    <div className={`panel-elevated flex flex-col gap-md smooth-transition ${isSuccess ? "border-border" : "border-danger/50"}`}>
      <div className="flex items-center justify-between border-b border-border pb-sm">
        <h3 className="text-h3 font-semibold text-text-primary">Execution Result</h3>
        <span className={`px-3 py-1 rounded-full text-small font-medium ${isSuccess ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {isSuccess ? "Success" : "Failed"}
        </span>
      </div>

      {!isSuccess && result.error && (
        <div className="text-danger bg-danger/10 p-md rounded-md font-mono text-small">
          Error: {result.error}
        </div>
      )}

      <div className="flex-1 bg-[#09090b] rounded-lg border border-border p-md overflow-x-auto text-small text-text-secondary font-mono">
        {result.data?.output ? (
          <pre>{formatOutput(result.data.output)}</pre>
        ) : result.data ? (
          <pre>{formatOutput(result.data)}</pre>
        ) : null}
      </div>

      <div className="flex items-center gap-lg text-small text-text-muted mt-auto pt-sm border-t border-border/50">
        {requestId && <div><span className="text-text-secondary">Request ID:</span> {requestId}</div>}
        {duration !== undefined && <div><span className="text-text-secondary">Duration:</span> {duration}ms</div>}
      </div>
    </div>
  );
}