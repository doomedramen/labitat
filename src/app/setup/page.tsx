import { hasAdminUser } from "@/lib/db/admin";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SetupPage() {
  const hasAdmin = await hasAdminUser();
  if (hasAdmin) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Labitat</CardTitle>
          <CardDescription>Create your admin account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm />
        </CardContent>
      </Card>
    </main>
  );
}
