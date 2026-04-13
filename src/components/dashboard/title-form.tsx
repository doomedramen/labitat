"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { updateDashboardTitle } from "@/actions/settings";

interface TitleFormProps {
  title: string;
  localTitle: string | null;
  onTitleChange: (title: string | null) => void;
  onExitEdit: () => void;
}

export function TitleForm({ title, localTitle, onTitleChange, onExitEdit }: TitleFormProps) {
  const haptic = useWebHaptics();
  const [saving, setSaving] = useState(false);

  const form = useForm({
    defaultValues: { title },
    validators: {
      onChange: z.object({
        title: z.string().min(1, "Title is required."),
      }),
    },
  });

  useEffect(() => {
    form.setFieldValue("title", localTitle ?? title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTitle, title]);

  async function handleSave() {
    const value = form.getFieldValue("title");
    if (value && value.trim()) {
      setSaving(true);
      try {
        await updateDashboardTitle(value.trim());
        toast.success("Dashboard saved");
        haptic.trigger("success");
      } catch {
        toast.error("Failed to save title");
        haptic.trigger("error");
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="w-full max-w-xs"
    >
      <form.Field name="title">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <div className="relative">
              <Input
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  onTitleChange(e.target.value);
                }}
                onBlur={field.handleBlur}
                className={cn("h-8", saving && "pr-8")}
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    form.handleSubmit();
                  }
                  if (e.key === "Escape") {
                    onTitleChange(null);
                    onExitEdit();
                  }
                }}
                aria-invalid={isInvalid || undefined}
                autoFocus
              />
              {saving && (
                <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          );
        }}
      </form.Field>
    </form>
  );
}
