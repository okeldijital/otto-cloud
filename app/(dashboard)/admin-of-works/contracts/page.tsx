import { redirect } from "next/navigation";

export default function LegacyContractsRedirect() {
  redirect("/contracts");
}
