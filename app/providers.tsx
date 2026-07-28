"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { queryClient } from "@/lib/queryClient";
import dynamic from "next/dynamic";

const ToastContainer = dynamic(
  () => import("@/components/ui/ToastContainer"),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <OrgProvider>
            {children}
            <ToastContainer />
          </OrgProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
