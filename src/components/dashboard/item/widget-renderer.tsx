import { useMemo } from "react";
import { WidgetContainer } from "@/components/widgets/widget-container";
import { WidgetContainerEdit } from "@/components/widgets/widget-container-edit";
import type { ServiceData } from "@/lib/adapters/types";
import type { ServiceDefinition } from "@/lib/adapters/types";
import type { ItemRow } from "@/lib/types";
import { parseStatCardOrder } from "@/hooks/use-stat-card-order";

interface WidgetRendererProps {
  serviceDef: ServiceDefinition | null;
  effectiveData: ServiceData | null;
  isClientSide: boolean;
  editMode: boolean;
  item: ItemRow;
}

/**
 * Client-side widget renderer.
 * Handles both view mode (WidgetContainer) and edit mode (WidgetContainerEdit).
 *
 * Note: This component only runs on the client. SSR is handled by ItemCard
 * which renders WidgetContainer directly with cached data.
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

  // Parse display settings from item
  const statDisplayMode = (item.statDisplayMode as "icon" | "label") ?? "label";
  const statCardOrder = parseStatCardOrder(item.statCardOrder);

  // Don't render client-side-only services without data
  if (isClientSide && !effectiveData) {
    return null;
  }

  if (!(hasCustomWidget || hasPayload) || !effectiveData || !serviceDef) {
    return null;
  }

  // Custom widgets handle their own rendering
  if (hasCustomWidget && serviceDef.renderWidget) {
    return <serviceDef.renderWidget {...(effectiveData as Record<string, unknown>)} />;
  }

  // Standard widgets
  if (hasPayload && payload) {
    // Edit mode: use WidgetContainerEdit for drag-and-drop
    if (editMode) {
      return (
        <WidgetContainerEdit
          payload={payload}
          statDisplayMode={statDisplayMode}
          statCardOrder={statCardOrder}
          itemId={item.id}
        />
      );
    }

    // View mode: use WidgetContainer (props-based, no Context)
    return (
      <WidgetContainer
        payload={payload}
        statDisplayMode={statDisplayMode}
        statCardOrder={statCardOrder}
        editMode={false}
      />
    );
  }

  return null;
}
