"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";

interface TitleFormProps {
  title: string;
  localTitle: string | null;
  onTitleChange: (title: string | null) => void;
  onExitEdit: () => void;
}

export function TitleForm({ title, localTitle, onTitleChange, onExitEdit }: TitleFormProps) {
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
      className="w-full max-w-xs"
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
              className="h-8"
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
    </form>
  );
}
