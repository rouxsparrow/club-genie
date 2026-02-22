import { redirect } from "next/navigation";

export default function DeniedRedirectPage() {
  redirect("/access-denied");
}
