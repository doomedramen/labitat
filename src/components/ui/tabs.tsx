"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  value,
  onValueChange,
  children,
}: {
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{
              value: string;
              activeValue?: string;
              onChange?: (value: string) => void;
            }>,
            {
              activeValue: value,
              onChange: onValueChange,
            },
          );
        }
        return child;
      })}
    </div>
  );
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      data-slot="tabs-list"
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  className,
  value,
  children,
  activeValue,
  onChange,
}: {
  className?: string;
  value: string;
  children: React.ReactNode;
  activeValue?: string;
  onChange?: (value: string) => void;
}) {
  const isActive = activeValue === value;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      data-slot="tabs-trigger"
      onClick={() => onChange?.(value)}
    >
      {children}
    </button>
  );
}

function TabsContent({
  className,
  value,
  children,
  activeValue,
}: {
  className?: string;
  value: string;
  children: React.ReactNode;
  activeValue?: string;
}) {
  if (activeValue !== value) return null;
  return (
    <div
      className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)}
      data-slot="tabs-content"
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
