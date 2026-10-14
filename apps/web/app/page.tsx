/**
 * Root page — redirect to /dashboard.
 *
 * The middleware handles the auth check: unauthenticated visitors are
 * redirected to /login before they ever reach the dashboard. This page
 * exists only so that hitting / lands somewhere sensible.
 */
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
