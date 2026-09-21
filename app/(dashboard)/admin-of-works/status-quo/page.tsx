import { redirect } from "next/navigation";

export default function LegacyStatusQuoRedirect() {
  redirect("/dashboard");
}
