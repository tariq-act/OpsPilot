import { redirect } from "next/navigation";

/** Create flow opens as a dialog on the list page. */
export default function NewTechnicianPage() {
  redirect("/dashboard/technicians?create=1");
}
