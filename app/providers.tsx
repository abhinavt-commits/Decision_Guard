"use client";
import { useEffect } from "react";
import { AppProvider } from "@/lib/app-state";
import { TermProvider } from "@/components/app-shell";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <AppProvider>
      <TermProvider>{children}</TermProvider>
    </AppProvider>
  );
}
