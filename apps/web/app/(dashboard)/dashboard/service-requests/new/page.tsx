import { redirect } from "next/navigation";

/** Create flow opens as a dialog on the list page. */
export default function NewServiceRequestPage() {
  redirect("/dashboard/service-requests?create=1");
}
