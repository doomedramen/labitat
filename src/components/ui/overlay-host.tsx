export function OverlayHost() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div
        id="app-overlay-top"
        className="safe-area-pad-top pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      />
      <div
        id="app-overlay-bottom"
        className="safe-area-pad-bottom pointer-events-none absolute inset-x-0 bottom-0"
      />
    </div>
  );
}
