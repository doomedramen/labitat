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
    <div className={className} data-slot="tabs" data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ value: string; "data-value"?: string }>,
            {
              "data-value": value,
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
  "data-value": activeValue,
}: {
  className?: string;
  value: string;
  children: React.ReactNode;
  "data-value"?: string;
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
      data-value={value}
    >
      {children}
    </button>
  );
}

function TabsContent({
  className,
  value,
  children,
  "data-value": activeValue,
}: {
  className?: string;
  value: string;
  children: React.ReactNode;
  "data-value"?: string;
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
