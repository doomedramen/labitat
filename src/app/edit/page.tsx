import { redirect } from "next/navigation";
import { hasEditAccess } from "@/lib/auth/guard";
export const dynamic = "force-dynamic";
export default async function EditPage() {
  redirect((await hasEditAccess()) ? "/?arrange=1" : "/");
}
