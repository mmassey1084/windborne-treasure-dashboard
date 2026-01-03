/**
 * Fetch JSON safely:
 * - Handles non-200 responses
 * - Handles invalid JSON (corrupted payloads)
 * - Returns { ok, data, error }
 */
export async function fetchJsonSafely(url, { timeoutMs = 12_000 } = {}) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: abortController.signal });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        error: `HTTP ${response.status} from ${url}`
      };
    }

    const textBody = await response.text();
    if (url.includes("/treasure/00.json") || url.includes("00.json")) {
  console.log("DEBUG 00.json first 300 chars:", textBody.slice(0, 300));
}

    try {
      const parsed = JSON.parse(textBody);
      return { ok: true, data: parsed, error: null };
    } catch (jsonError) {
      // Payload can be corrupted sometimes per prompt. 
      return {
        ok: false,
        data: null,
        error: `Invalid JSON from ${url}: ${String(jsonError)}`
      };
    }
  } catch (networkError) {
    return {
      ok: false,
      data: null,
      error: `Fetch failed for ${url}: ${String(networkError)}`
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
