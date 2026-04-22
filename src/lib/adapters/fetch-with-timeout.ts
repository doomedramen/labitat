const DEFAULT_TIMEOUT_MS = 10_000;

interface HttpsRequestOptions {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
  rejectUnauthorized: boolean;
}

async function fetchWithHttps(
  url: string,
  options: RequestInit & { insecure?: boolean },
  timeoutMs: number,
): Promise<Response> {
  const { insecure, ...fetchInit } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const https = await import("https");
    const urlObj = new URL(url);

    const opts: HttpsRequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port) : 443,
      path: urlObj.pathname + urlObj.search,
      method: fetchInit?.method || "GET",
      headers: fetchInit?.headers as Record<string, string>,
      rejectUnauthorized: !insecure,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          const response = new Response(body, {
            status: res.statusCode || 500,
            statusText: res.statusMessage,
            headers: new Headers(res.headers as Record<string, string>),
          });
          resolve(response);
        });
      });

      req.on("error", (err) => {
        // Check if this was a timeout-induced abort
        if (timedOut) {
          reject(new DOMException("Request timed out", "TimeoutError"));
          return;
        }
        if (err.message.includes("certificate") || err.message.includes("SSL")) {
          reject(new Error(`Request failed: self-signed certificate`));
        } else {
          reject(err);
        }
      });

      req.on("timeout", () => {
        timedOut = true;
        req.destroy();
        reject(new DOMException("Request timed out", "TimeoutError"));
      });

      // Set timeout on the request itself
      req.setTimeout(timeoutMs);

      if (fetchInit?.body) {
        req.write(fetchInit.body);
      }
      req.end();

      controller.signal.addEventListener("abort", () => {
        if (!timedOut) {
          req.destroy();
        }
      });
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Wrapper around global fetch with a request timeout.
 * Aborts the request if it doesn't complete within the specified time.
 * Throws DOMException with name "TimeoutError" on timeout (vs "AbortError" for manual aborts).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { insecure?: boolean },
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();

  if (init?.insecure && url.startsWith("https://")) {
    return fetchWithHttps(url, init, timeoutMs);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let signal: AbortSignal;
  if (init?.signal) {
    if (AbortSignal.any) {
      signal = AbortSignal.any([init.signal, controller.signal]);
    } else {
      init.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
      signal = controller.signal;
    }
  } else {
    signal = controller.signal;
  }

  try {
    return await globalThis.fetch(input, { ...init, signal });
  } catch (err) {
    if (timedOut && err instanceof DOMException && err.name === "AbortError") {
      throw new DOMException("Request timed out", "TimeoutError");
    }
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new DOMException("Request timed out", "TimeoutError");
    }

    if (err instanceof Error) {
      if (err.message.includes("fetch failed")) {
        const cause = (err as any).cause;
        if (cause instanceof Error) {
          throw new Error(`Request failed: ${cause.message}`);
        }
      }
      throw new Error(`Request failed: ${err.message}`);
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
