"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocumentsRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/office/documents"); }, [router]);
  return null;
}
