import { useState, useEffect, useRef } from "react";
import { runOtto } from "../../services/otto-client/ottoClient";
import { getJobStatus } from "../../services/otto-client/jobClient";
import { useOttoStore } from "../../store/ottoStore";

export function CommandInput() {
  const [task, setTask] = useState("");
  const [payloadJson, setPayloadJson] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const { setInput, setResult, addLog, setLoading, loading } = useOttoStore();

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError("");
    stopPolling();

    let payload;
    try {
      payload = JSON.parse(payloadJson);
    } catch {
      setJsonError("Invalid JSON");
      return;
    }

    const input = { task, payload };
    setInput(input);
    setLoading(true);
    addLog({ type: "request", data: "Starting request..." });

    try {
      const result = await runOtto(input);

      if (result.data?.jobId) {
        const jobId = result.data.jobId;
        addLog({ type: "request", data: `Job created: ${jobId}` });
        addLog({ type: "request", data: `Job started: ${jobId}` });

        pollRef.current = setInterval(async () => {
          try {
            const status = await getJobStatus(jobId);
            if (status.data?.status === "completed" || status.data?.status === "failed") {
              stopPolling();
              setResult(status);
              if (status.data.status === "completed") {
                addLog({ type: "response", data: `Job completed: ${jobId}` });
              } else {
                addLog({ type: "error", data: `Job failed: ${jobId}` });
              }
              setLoading(false);
            }
          } catch (err) {
            addLog({ type: "error", data: String(err) });
          }
        }, 2000);
      } else {
        setResult(result);
        const duration = result.meta?.duration ?? 0;
        addLog({ type: "response", data: `Completed in ${duration}ms` });
        setLoading(false);
      }
    } catch (error) {
      addLog({ type: "error", data: String(error) });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Task:</label>
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter task"
          required
        />
      </div>
      <div>
        <label>Payload (JSON):</label>
        <textarea
          value={payloadJson}
          onChange={(e) => {
            setPayloadJson(e.target.value);
            setJsonError("");
          }}
          placeholder='{"key": "value"}'
        />
        {jsonError && <p className="error">{jsonError}</p>}
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Running..." : "Run Otto"}
      </button>
    </form>
  );
}