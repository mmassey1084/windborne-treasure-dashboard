/**
 * Small geo helper library.
 */

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(pointA, pointB) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLon = toRad(pointB.lon - pointA.lon);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function formatMeters(meters) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
