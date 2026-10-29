import type { ServiceDefinition } from "./types";
import { BookOpen, ShoppingCart, Check, CalendarDays } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { validateResponse } from "./validate";

type NorishData = { _status: "ok"; recipes: number; pending: number; done: number; today: number };

export const norishDefinition: ServiceDefinition<NorishData> = {
  id: "norish",
  name: "Norish",
  icon: "norish",
  category: "productivity",
  defaultPollingMs: 60_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://norish.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helperText: "Create a key in Norish Settings → User → API keys.",
    },
  ],
  async fetchData(config) {
    if (!config.url) throw new Error("Norish URL is required");
    if (!config.apiKey) throw new Error("Norish API key is required");
    const base = `${config.url.replace(/\/+$/, "")}/api/v1`;
    async function request(path: string, body?: object): Promise<unknown> {
      const response = await fetchWithTimeout(`${base}/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "x-api-key": config.apiKey,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new Error(`Norish ${path} error: ${response.status}`);
      return response.json();
    }
    const [rawRecipes, groceries, today] = await Promise.all([
      request("recipes/search", { cursor: 0, limit: 1 }),
      request("groceries"),
      request("planned-recipes/today"),
    ]);
    const recipes = validateResponse<{ total: number }>(
      rawRecipes,
      ["total"],
      [
        { path: "total", type: "number" },
        { path: "recipes", type: "array" },
      ],
      { adapter: "norish" },
    );
    if (!Number.isSafeInteger(recipes.total) || recipes.total < 0)
      throw new Error("Norish invalid recipe total");
    if (
      !Array.isArray(groceries) ||
      groceries.some((item) => !item || typeof item.isDone !== "boolean")
    )
      throw new Error("Norish invalid groceries response");
    if (
      !Array.isArray(today) ||
      today.some(
        (item) => !item || typeof item.id !== "string" || typeof item.recipeName !== "string",
      )
    )
      throw new Error("Norish invalid planned recipes response");
    const done = groceries.filter((item) => item.isDone).length;
    return {
      _status: "ok",
      recipes: recipes.total,
      pending: groceries.length - done,
      done,
      today: today.length,
    };
  },
  toPayload(data) {
    return {
      stats: [
        { id: "recipes", label: "Recipes", value: data.recipes, icon: BookOpen },
        { id: "pending", label: "Groceries to buy", value: data.pending, icon: ShoppingCart },
        { id: "done", label: "Groceries done", value: data.done, icon: Check },
        { id: "today", label: "Planned today", value: data.today, icon: CalendarDays },
      ],
    };
  },
};
