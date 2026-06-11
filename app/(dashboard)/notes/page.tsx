"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotesRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/office/notes"); }, [router]);
  return null;
}
