"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NetworkHub() {
  const router = useRouter();
  useEffect(() => { router.replace("/network/contacts"); }, [router]);
  return null;
}
