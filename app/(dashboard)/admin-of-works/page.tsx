"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminOfWorksHub() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin-of-works/contracts"); }, [router]);
  return null;
}
