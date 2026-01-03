import { useMemo } from "react";
import { haversineDistanceMeters, formatMeters } from "../lib/geoMath.js";

export default function BallonDetails({
  selectedTrack,
  airQualityState,
  isLoadingAirQuality
}) {
  const stats = useMemo(() => {
    if (!selectedTrack?.points?.length) return null;

    const points = selectedTrack.points;

    // Estimate distance traveled over the sampled points.
    let totalDistanceMeters = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistanceMeters += haversineDistanceMeters(points[i - 1], points[i]);
    }

    // points are sorted oldest -> newest (23 -> 0)
    const oldest = points[0];
    const newest = points[points.length - 1];

    return {
      totalDistanceMeters,
      newest,
      oldest,
      pointsCount: points.length
    };
  }, [selectedTrack]);

  if (!selectedTrack) {
    return (
      <div>
        <h2 style={{ margin: "0 0 8px 0" }}>Balloon Details</h2>
        <div>Click a balloon on the map to view its last 24 hours of movement.</div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 8px 0" }}>Balloon Details</h2>

      <div style={{ marginBottom: 10 }}>
        <div>
          <strong>ID:</strong> {selectedTrack.id}
        </div>

        {stats?.newest ? (
          <div>
            <strong>Current location:</strong>{" "}
            {stats.newest.lat.toFixed(4)}, {stats.newest.lon.toFixed(4)}
          </div>
        ) : null}

        <div>
          <strong>Points captured:</strong> {stats?.pointsCount ?? "—"}
        </div>

        <div>
          <strong>Approx distance (sampled):</strong>{" "}
          {formatMeters(stats?.totalDistanceMeters)}
        </div>

        {/* WindBorne tuple payload includes a 3rd numeric value. I don’t assume what it is,
            so I show it as Value 3 to stay honest + robust. */}
        {stats?.newest?.thirdValue != null ? (
          <div>
            <strong>Value 3 (from API):</strong>{" "}
            {stats.newest.thirdValue.toFixed(3)}
          </div>
        ) : null}
      </div>

      <hr />

      <h3 style={{ margin: "10px 0 6px 0" }}>Air Quality (Open-Meteo)</h3>

      {isLoadingAirQuality ? (
        <div>Loading air quality…</div>
      ) : airQualityState?.ok && airQualityState?.data?.current ? (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <strong>US AQI:</strong> {airQualityState.data.current.us_aqi ?? "—"}
          </div>
          <div>
            <strong>PM2.5:</strong> {airQualityState.data.current.pm2_5 ?? "—"} µg/m³
          </div>
          <div>
            <strong>PM10:</strong> {airQualityState.data.current.pm10 ?? "—"} µg/m³
          </div>
          <div>
            <strong>CO:</strong> {airQualityState.data.current.carbon_monoxide ?? "—"} µg/m³
          </div>
        </div>
      ) : airQualityState?.error ? (
        <div style={{ color: "crimson" }}>
          Air quality fetch failed: {airQualityState.error}
        </div>
      ) : (
        <div>Air quality data not available.</div>
      )}
    </div>
  );
}
