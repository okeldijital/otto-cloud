import { redirect } from "next/navigation";

export default function SystemsRedirect() {
  redirect("/admin?tab=systems");
}
