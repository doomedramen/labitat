"use client";

import * as React from "react";
import { HexColorPicker } from "react-colorful";
import {
  THEME_KEYS,
  type ThemeKey,
  DEFAULT_CUSTOM_LIGHT,
  DEFAULT_CUSTOM_DARK,
} from "@/lib/theme-semantic";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const THEME_KEY_LABELS: Record<ThemeKey, string> = {
  background: "Background",
  border: "Border",
  text: "Text",
  "sub-card": "Sub-card (stat cards)",
  "graph-1": "Graph 1 (primary)",
  "graph-2": "Graph 2 (secondary)",
  success: "Success (green)",
  danger: "Danger (amber)",
  error: "Error (red)",
};

function ColorPickerInput({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-8 w-8 cursor-pointer rounded-md border border-border shadow-sm"
        style={{ backgroundColor: color }}
      />
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-xs font-mono uppercase"
      />
    </div>
  );
}

export function ThemeEditor() {
  const { theme, setColor, resetToDefaults } = useCustomTheme();
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [openPickers, setOpenPickers] = React.useState<Record<ThemeKey, boolean>>({
    background: false,
    border: false,
    text: false,
    "sub-card": false,
    "graph-1": false,
    "graph-2": false,
    success: false,
    danger: false,
    error: false,
  });

  const colors = mode === "light" ? theme.light : theme.dark;
  const defaults = mode === "light" ? DEFAULT_CUSTOM_LIGHT : DEFAULT_CUSTOM_DARK;

  const handleColorChange = React.useCallback(
    (key: ThemeKey, color: string) => {
      setColor(key, color, mode);
    },
    [mode, setColor],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Custom Theme</h3>
        <button
          onClick={resetToDefaults}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Reset Defaults
        </button>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "light" | "dark")}>
        <TabsList className="mb-4">
          <TabsTrigger value="light" className="flex-1">
            Light
          </TabsTrigger>
          <TabsTrigger value="dark" className="flex-1">
            Dark
          </TabsTrigger>
        </TabsList>

        <TabsContent value="light">
          <div className="grid grid-cols-2 gap-3">
            {THEME_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs">{THEME_KEY_LABELS[key]}</span>
                <ColorPickerInput
                  color={theme.light[key]}
                  onChange={(color) => handleColorChange(key, color)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dark">
          <div className="grid grid-cols-2 gap-3">
            {THEME_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs">{THEME_KEY_LABELS[key]}</span>
                <ColorPickerInput
                  color={theme.dark[key]}
                  onChange={(color) => handleColorChange(key, color)}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
