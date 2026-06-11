"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
      <div className="bg-premium-glass border border-white/5 rounded-2xl p-8 backdrop-blur-xl max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mx-auto">
          <span className="text-danger text-2xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="text-sm text-text-secondary">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
