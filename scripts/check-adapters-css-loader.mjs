// Only the metadata validator registers this hook. App Build still compiles
// and validates the real styles through Next.js.
export async function load(url, context, nextLoad) {
  if (new URL(url).pathname.endsWith(".css")) {
    return { format: "module", source: "export default Object.freeze({});", shortCircuit: true };
  }
  return nextLoad(url, context);
}
