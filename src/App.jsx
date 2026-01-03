import { useEffect, useMemo, useState } from "react";
import BalloonMap from "./components/BalloonMap.jsx";
import BalloonDetails from "./components/BalloonDetails.jsx";
import { fetchLast24HoursTreasure } from "./lib/windborneTreasure.js";
import { fetchAirQualityForLocation } from "./lib/openMeteoAirQuality.js";

export default function App() {
  const [balloonTracks, setBalloonTracks] = useState([]);
  const [debugStats, setDebugStats] = useState({
  totalTracks: 0,
  totalPoints: 0,
  lastUpdated: null
});

  const [selectedBalloonId, setSelectedBalloonId] = useState(null);
  const [isLoadingTreasure, setIsLoadingTreasure] = useState(true);
  const [treasureErrors, setTreasureErrors] = useState([]);

  const [isLoadingAirQuality, setIsLoadingAirQuality] = useState(false);
  const [airQualityState, setAirQualityState] = useState(null);

  // Pull treasure data on load and refresh every minute.
  useEffect(() => {
    let isStillMounted = true;

    async function loadTreasureData() {
      setIsLoadingTreasure(true);

      const result = await fetchLast24HoursTreasure();

      if (!isStillMounted) return;

      // Surface fetch/parse issues without failing the app.
      const errors = result.extractedByHour
        .filter((h) => !h.ok)
        .map((h) => `Hour ${String(h.hourIndex).padStart(2, "0")}: ${h.error}`);

      setTreasureErrors(errors);

      // Drop “unknown” tracks if you want cleaner UX; for now we keep them.
      setBalloonTracks(result.tracks);
      const totalPoints = result.tracks.reduce((sum, t) => sum + t.points.length, 0);

setDebugStats({
  totalTracks: result.tracks.length,
  totalPoints,
  lastUpdated: new Date().toLocaleTimeString()
});

      // Auto-select first track if none selected.
      if (!selectedBalloonId && result.tracks.length) {
        setSelectedBalloonId(result.tracks[0].id);
      }

      setIsLoadingTreasure(false);
    }

    loadTreasureData();

    const refreshIntervalId = setInterval(loadTreasureData, 60_000);

    return () => {
      isStillMounted = false;
      clearInterval(refreshIntervalId);
    };
  }, [selectedBalloonId]);

  const selectedTrack = useMemo(
    () => balloonTracks.find((t) => t.id === selectedBalloonId) ?? null,
    [balloonTracks, selectedBalloonId]
  );

  // When a balloon is selected, fetch air quality for its newest location.
  useEffect(() => {
    let isStillMounted = true;

    async function loadAirQuality() {
      if (!selectedTrack?.points?.length) return;

      const newestPoint = selectedTrack.points.find((p) => p.hourIndex === 0) ?? selectedTrack.points[selectedTrack.points.length - 1];
      if (!newestPoint) return;

      setIsLoadingAirQuality(true);
      const result = await fetchAirQualityForLocation({ latitude: newestPoint.lat, longitude: newestPoint.lon });

      if (!isStillMounted) return;

      setAirQualityState(result);
      setIsLoadingAirQuality(false);
    }

    loadAirQuality();

    return () => {
      isStillMounted = false;
    };
  }, [selectedTrack]);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>WindBorne Treasure Dashboard</h1>
        <div style={{ opacity: 0.8 }}>
          Live constellation tracks (last 24 hours) + Air Quality context (Open-Meteo).
        </div>
      </header>
      {isLoadingTreasure ? <div>Loading constellation data…</div> : null}

      {treasureErrors.length ? (
        <details style={{ margin: "8px 0", color: "#7a4b00" }}>
          <summary>Some hour files failed to load/parse (handled safely)</summary>
          <ul>
            {treasureErrors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </details>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <BalloonMap
            balloonTracks={balloonTracks}
            selectedBalloonId={selectedBalloonId}
            onSelectBalloonId={setSelectedBalloonId}
          />
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <BalloonDetails
            selectedTrack={selectedTrack}
            airQualityState={airQualityState}
            isLoadingAirQuality={isLoadingAirQuality}
          />
        </div>
      </div>

      <footer style={{ marginTop: 16, opacity: 0.8, fontSize: 13 }}>
        Tip: Host on Netlify/Vercel so your <code>submission_url</code> is a real interactive page.
      </footer>
    </div>
  );
}
