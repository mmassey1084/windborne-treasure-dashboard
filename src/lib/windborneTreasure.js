import { fetchJsonSafely } from "./safeJson.js";

/**
 * WindBorne Treasure API:
 * - 00.json = current
 * - 01.json = 1 hour ago
 * - ...
 * - 23.json = 23 hours ago
 *
 * The format is undocumented and may be corrupted.
 *
 * Robust approach:
 * 1) Fetch all 24 files safely
 * 2) Support multiple schema shapes:
 *    - Array of tuples: [[lat, lon, value3], ...] 
 *    - Object-based shapes (fallback) where lat/lon appear in objects
 * 3) Group into "tracks" using best-effort IDs.
 *
 */

// Keys we accept for lat/lon/alt/time (best-effort fallback)
const LAT_KEYS = ["lat", "latitude", "y"];
const LON_KEYS = ["lon", "lng", "longitude", "x"];
const ALT_KEYS = ["alt", "altitude", "z"];
const TIME_KEYS = ["time", "timestamp", "ts", "t"];

function pickFirstNumber(obj, keys) {
  for (const key of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const numberValue = typeof value === "string" ? Number(value) : value;
      if (Number.isFinite(numberValue)) return numberValue;
    }
  }
  return null;
}

function pickId(obj) {
  const idKeys = ["id", "balloon_id", "device_id", "uuid", "name", "callsign"];
  for (const key of idKeys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null) {
      return String(obj[key]);
    }
  }
  return null;
}

/**
 * Depth-first scan: find any objects that contain lat+lon numbers.
 */
function extractPositionCandidates(rootJson) {
  const results = [];
  const stack = [{ value: rootJson, parentIdHint: null }];

  while (stack.length > 0) {
    const { value, parentIdHint } = stack.pop();
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const item of value) stack.push({ value: item, parentIdHint });
      continue;
    }

    if (typeof value === "object") {
      const lat = pickFirstNumber(value, LAT_KEYS);
      const lon = pickFirstNumber(value, LON_KEYS);

      if (lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        const altitudeMeters = pickFirstNumber(value, ALT_KEYS);
        const timestamp = pickFirstNumber(value, TIME_KEYS);
        const explicitId = pickId(value);

        results.push({
          id: explicitId ?? parentIdHint ?? "unknown",
          lat,
          lon,
          altitudeMeters: altitudeMeters ?? null,
          timestamp: timestamp ?? null
        });
      }

      const nestedIdHint = pickId(value) ?? parentIdHint;
      for (const childValue of Object.values(value)) {
        stack.push({ value: childValue, parentIdHint: nestedIdHint });
      }
    }
  }

  return results;
}

/**
 * Parse the tuple-style payload:
 * [
 *   [lat, lon, value3],
 *   [lat, lon, value3],
 *   ...
 * ]
 */
function parseTuplePositions(tupleArray, hourIndex) {
  if (!Array.isArray(tupleArray)) return [];

  return tupleArray
    .map((tuple, index) => {
      if (!Array.isArray(tuple)) return null;

      const lat = Number(tuple?.[0]);
      const lon = Number(tuple?.[1]);
      const value3 = tuple?.[2] != null ? Number(tuple[2]) : null;

      // Validate lat/lon to avoid corrupted entries
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

      return {
        id: `balloon_${index}`,
        lat,
        lon,
        thirdValue: Number.isFinite(value3) ? value3 : null,
        hourIndex
      };
    })
    .filter(Boolean);
}

export async function fetchLast24HoursTreasure() {
  const baseUrl = "/windborne/treasure";

  const hourIndexes = Array.from({ length: 24 }, (_, i) => i);

  const responses = await Promise.all(
    hourIndexes.map(async (hourIndex) => {
      const fileName = String(hourIndex).padStart(2, "0");
      const url = `${baseUrl}/${fileName}.json`;

      const result = await fetchJsonSafely(url);

      return {
        hourIndex,
        url,
        ...result
      };
    })
  );

  const extractedByHour = responses.map((r) => {
    if (!r.ok || r.data == null) {
      return {
        hourIndex: r.hourIndex,
        ok: false,
        error: r.error,
        positions: []
      };
    }

    let positions = [];

    // ✅ Primary schema: array of tuples
    if (Array.isArray(r.data) && Array.isArray(r.data[0])) {
      positions = parseTuplePositions(r.data, r.hourIndex);
    } else {
      // ✅ Fallback schema: object scanning
      positions = extractPositionCandidates(r.data).map((p) => ({
        ...p,
        thirdValue: null,
        hourIndex: r.hourIndex
      }));
    }

    return {
      hourIndex: r.hourIndex,
      ok: true,
      error: null,
      positions
    };
  });

  // Group into tracks by id
  const tracksById = new Map();

  for (const hourBucket of extractedByHour) {
    for (const point of hourBucket.positions) {
      const key = point.id || "unknown";
      if (!tracksById.has(key)) tracksById.set(key, []);
      tracksById.get(key).push(point);
    }
  }

  // Sort each track oldest -> newest based on hourIndex (23 -> 0)
  for (const [id, points] of tracksById.entries()) {
    points.sort((a, b) => b.hourIndex - a.hourIndex);
    tracksById.set(id, points);
  }

  return {
    extractedByHour,
    tracks: Array.from(tracksById.entries()).map(([id, points]) => ({
      id,
      points
    }))
  };
}
