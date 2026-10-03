import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Root() {
  redirect((await currentUser()) ? "/home" : "/login");
}
