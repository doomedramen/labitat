"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBackground } from "@/hooks/use-background";
import { Header } from "@/components/dashboard/header";
import { Footer } from "@/components/dashboard/footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";

export function DashboardViewChrome({
  isLoggedIn,
  title,
  children,
}: {
  isLoggedIn: boolean;
  title: string;
  children: ReactNode;
}) {
  useBackground();
  const router = useRouter();

  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <Header
        editMode={false}
        isLoggedIn={isLoggedIn}
        title={title}
        localTitle={localTitle}
        onTitleChange={setLocalTitle}
        onToggleEditMode={() => router.push("/edit")}
        onSignInClick={() => setLoginOpen(true)}
      />

      {children}

      <Footer editMode={false} />

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>Enter your credentials to access your dashboard.</DialogDescription>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
