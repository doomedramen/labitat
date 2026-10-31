"use client";

import { useState, type ReactNode } from "react";
import { Header } from "@/components/dashboard/header";
import { Footer } from "@/components/dashboard/footer";
import { SseBanner } from "@/components/dashboard/sse-banner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";

export function DashboardViewChrome({
  canEdit,
  title,
  children,
}: {
  canEdit: boolean;
  title: string;
  children: ReactNode;
}) {
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <SseBanner />
      <Header
        editMode={false}
        canEdit={canEdit}
        title={title}
        localTitle={localTitle}
        onTitleChange={setLocalTitle}
        onToggleEditMode={() => window.location.assign("/edit")}
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
    </div>
  );
}
