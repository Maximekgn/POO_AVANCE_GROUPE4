"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const defaultMarkerIcon = L.icon({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapProps {
  center?: number[];
  onSelectPosition?: (latlng: [number, number]) => void;
}

const ClickHandler: React.FC<{
  onSelectPosition: (latlng: [number, number]) => void;
}> = ({ onSelectPosition }) => {
  useMapEvents({
    click(event) {
      onSelectPosition([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
};

const RecenterMap: React.FC<{ center?: number[] }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (!center || center.length < 2) return;

    map.setView(center as L.LatLngExpression, map.getZoom(), {
      animate: false,
    });
  }, [center, map]);

  return null;
};

const Map: React.FC<MapProps> = ({ center, onSelectPosition }) => {
  const mapCenter =
    (center as L.LatLngExpression) || ([6.1319, 1.2228] as L.LatLngExpression);

  return (
    <MapContainer
      center={mapCenter}
      zoom={center ? 13 : 7}
      scrollWheelZoom={false}
      className="h-[35vh] rounded-lg z-0"
    >
      <RecenterMap center={center} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {onSelectPosition && <ClickHandler onSelectPosition={onSelectPosition} />}
      {center && (
        <Marker
          position={center as L.LatLngExpression}
          icon={defaultMarkerIcon}
        />
      )}
    </MapContainer>
  );
};

export default Map;
