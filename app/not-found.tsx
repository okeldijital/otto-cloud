import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
      <div className="bg-premium-glass border border-white/5 rounded-2xl p-8 backdrop-blur-xl max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">404</h1>
        <p className="text-text-secondary">Page not found</p>
        <Link href="/dashboard" className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
