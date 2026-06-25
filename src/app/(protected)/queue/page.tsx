import { redirect } from "next/navigation";

// Pending reviews now live under the unified Reviews page.
export default function QueuePage() {
  redirect("/reviews?tab=pending");
}
