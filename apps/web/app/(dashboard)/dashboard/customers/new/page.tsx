import { redirect } from "next/navigation";

/** Create flow opens as a dialog on the list page. */
export default function NewCustomerPage() {
  redirect("/dashboard/customers?create=1");
}
