import { redirect } from "next/navigation";

export default function FriendsPage() {
  redirect("/community?tab=friends");
}
