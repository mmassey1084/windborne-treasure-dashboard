import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import L from "leaflet";

const WORLD_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;

export default function BalloonMap({
  balloonTracks,
  selectedBalloonId,
  onSelectBalloonId
}) {
  const selectedTrack = balloonTracks.find((t) => t.id === selectedBalloonId);

  return (
    <MapContainer center={WORLD_CENTER} zoom={DEFAULT_ZOOM} style={{ height: "70vh", width: "100%" }}>
      <TileLayer
        
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {balloonTracks.map((track) => {
        const newestPoint = track.points.find((p) => p.hourIndex === 0) ?? track.points[track.points.length - 1];
        if (!newestPoint) return null;

        const markerPosition = [newestPoint.lat, newestPoint.lon];
        const isSelected = track.id === selectedBalloonId;

        return (
          <CircleMarker
            key={track.id}
            center={markerPosition}
            radius={isSelected ? 8 : 5}
            pathOptions={{}}
            eventHandlers={{
              click: () => onSelectBalloonId(track.id)
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ fontSize: 12 }}>
                <strong>{track.id}</strong>
                <div>Lat: {newestPoint.lat.toFixed(3)}, Lon: {newestPoint.lon.toFixed(3)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {selectedTrack?.points?.length ? (
        <Polyline
          positions={selectedTrack.points.map((p) => [p.lat, p.lon])}
          pathOptions={{}}
        />
      ) : null}
    </MapContainer>
  );
}
