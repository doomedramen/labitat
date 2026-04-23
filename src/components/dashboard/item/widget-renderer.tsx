import { useMemo } from "react";
import { WidgetContainer } from "@/components/widgets/widget-container";
import type { ServiceData } from "@/lib/adapters/types";
import type { ServiceDefinition } from "@/lib/adapters/types";
import type { ItemRow } from "@/lib/types";
import { WidgetDisplayProvider } from "./widget-display-context";
import { parseStatCardOrder } from "@/hooks/use-stat-card-order";

interface WidgetRendererProps {
  serviceDef: ServiceDefinition | null;
  effectiveData: ServiceData | null;
  isClientSide: boolean;
  editMode: boolean;
  item: ItemRow;
}

/**
 * Server-compatible widget renderer.
 * During SSR: renders widgets from cached data.
 * During client edit mode: delegates to WidgetRendererClient for DnD support.
 */
export function WidgetRenderer({
  serviceDef,
  effectiveData,
  isClientSide,
  editMode,
  item,
}: WidgetRendererProps) {
  // Custom widget takes precedence, otherwise use toPayload
  const hasCustomWidget = !!serviceDef?.renderWidget && !isClientSide;

  const payload = useMemo(
    () =>
      effectiveData && serviceDef?.toPayload && !hasCustomWidget
        ? serviceDef.toPayload(effectiveData)
        : null,
    [effectiveData, serviceDef, hasCustomWidget],
  );

  const hasPayload = !!payload;

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      statDisplayMode: (item.statDisplayMode as "icon" | "label") ?? "label",
      statCardOrder: parseStatCardOrder(item.statCardOrder),
      editMode,
      itemId: item.id,
      defaultActiveIds: payload?.defaultActiveIds,
    }),
    [item.statDisplayMode, item.statCardOrder, editMode, item.id, payload],
  );

  // Don't render client-side-only services during SSR
  if (isClientSide && !effectiveData) {
    return null;
  }

  if (!(hasCustomWidget || hasPayload) || !effectiveData || !serviceDef) {
    return null;
  }

  return (
    <WidgetDisplayProvider value={contextValue}>
      {hasCustomWidget && serviceDef.renderWidget ? (
        <serviceDef.renderWidget {...(effectiveData as Record<string, unknown>)} />
      ) : hasPayload && payload ? (
        <WidgetContainer payload={payload} />
      ) : null}
    </WidgetDisplayProvider>
  );
}
