"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfficeHub() {
  const router = useRouter();
  useEffect(() => { router.replace("/office/status-quo"); }, [router]);
  return null;
}
