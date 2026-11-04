export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test"
  )
    return;
  const { startOperatorRuntime } = await import("./lib/operator-runtime");
  startOperatorRuntime();
}
