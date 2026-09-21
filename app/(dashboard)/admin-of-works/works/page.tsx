import { redirect } from "next/navigation";

export default function LegacyWorksAdministrationRedirect() {
  redirect("/catalog/works");
}
