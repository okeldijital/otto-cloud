import { StatusBar } from "../components/otto/StatusBar";
import { CommandInput } from "../components/otto/CommandInput";
import { ExecutionPanel } from "../components/otto/ExecutionPanel";
import { LogsViewer } from "../components/otto/LogsViewer";
import { ProtectedRoute } from "../components/otto/ProtectedRoute";

export default function RunPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-text-primary p-lg sm:p-xl md:p-2xl smooth-transition">
        <div className="max-w-7xl mx-auto space-y-lg">
          {/* Header Status */}
          <header className="mb-lg">
            <StatusBar />
          </header>

          {/* Main Grid Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg lg:gap-xl">
            <section className="lg:col-span-5 space-y-lg">
              <CommandInput />
            </section>

            <section className="lg:col-span-7">
              <ExecutionPanel />
            </section>
          </div>

          {/* Footer Logs */}
          <footer className="pt-lg">
            <LogsViewer />
          </footer>
        </div>
      </div>
    </ProtectedRoute>
  );
}