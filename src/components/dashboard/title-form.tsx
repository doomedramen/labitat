"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";

interface TitleFormProps {
  title: string;
  localTitle: string | null;
  onTitleChange: (title: string | null) => void;
  error?: string | null;
  saving?: boolean;
  onExitEdit: () => void;
}

export function TitleForm({
  title,
  localTitle,
  onTitleChange,
  error = null,
  saving = false,
  onExitEdit,
}: TitleFormProps) {
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="min-w-0 flex-1 sm:max-w-sm"
    >
      <form.Field name="title">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <Input
              value={field.state.value}
              onChange={(e) => {
                field.handleChange(e.target.value);
                onTitleChange(e.target.value);
              }}
              onBlur={field.handleBlur}
              className="h-9 text-base font-semibold tracking-[-0.02em]"
              aria-label="Dashboard title"
              aria-describedby={error ? "dashboard-title-error" : undefined}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onTitleChange(null);
                  onExitEdit();
                }
              }}
              aria-invalid={isInvalid || undefined}
              autoFocus
            />
          );
        }}
      </form.Field>
      {error ? (
        <p id="dashboard-title-error" role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
