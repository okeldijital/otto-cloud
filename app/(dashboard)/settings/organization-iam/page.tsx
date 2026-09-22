import { redirect } from "next/navigation";

/**
 * Canonical organization access settings live at /settings/organization.
 * Keep this route as a compatibility redirect so old bookmarks cannot create
 * a second, divergent IAM administration surface.
 */
export default function OrganizationIamCompatibilityPage() {
  redirect("/settings/organization");
}
