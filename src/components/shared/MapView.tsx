import { useEffect, useState } from "react";
import { DirectionsRenderer, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import type { LatLng } from "../../types";
import { distanceKm } from "../../lib/format";

export interface RouteInfo { distance: string; duration: string }
interface Props {
  rider: LatLng | null;   // live rider position
  target: LatLng;         // where the route goes (store first, then customer)
  store: LatLng;
  drop: LatLng;
  onRoute?: (r: RouteInfo) => void;
}

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export default function MapView(p: Props) {
  return KEY ? <LiveMap {...p} /> : <Fallback {...p} />;
}

function LiveMap({ rider, target, store, drop, onRoute }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: KEY! });
  const [dir, setDir] = useState<google.maps.DirectionsResult | null>(null);

  // Re-route only when the rider has moved roughly 100 m (3 decimals) or the target changes.
  useEffect(() => {
    if (!isLoaded || !rider) return;
    new google.maps.DirectionsService().route(
      { origin: rider, destination: target, travelMode: google.maps.TravelMode.DRIVING },
      (res, status) => {
        if (status === "OK" && res) {
          setDir(res);
          const leg = res.routes[0].legs[0];
          onRoute?.({ distance: leg.distance?.text ?? "", duration: leg.duration?.text ?? "" });
        }
      }
    );
  }, [isLoaded, rider?.lat.toFixed(3), rider?.lng.toFixed(3), target.lat, target.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <div className="map-box"><p>Google Maps failed to load. Check your API key and that "Maps JavaScript API" and "Directions API" are enabled.</p></div>;
  if (!isLoaded) return <div className="map-box"><p>Loading map…</p></div>;

  return (
    <GoogleMap mapContainerClassName="map-box" center={rider ?? target} zoom={14}
      options={{ disableDefaultUI: true, zoomControl: true }}>
      {dir && <DirectionsRenderer directions={dir} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#b04717", strokeWeight: 5 } }} />}
      <Marker position={store} label="S" />
      <Marker position={drop} label="C" />
      {rider && (
        <Marker position={rider} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#b04717", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }} />
      )}
    </GoogleMap>
  );
}

// Used when no API key is set, so the app still runs and shows straight-line distance.
function Fallback({ rider, target, onRoute }: Props) {
  const km = rider ? distanceKm(rider, target) : 0;
  useEffect(() => {
    onRoute?.({ distance: `${km.toFixed(1)} km (straight line)`, duration: `${Math.max(1, Math.round((km / 25) * 60))} min` });
  }, [km.toFixed(2)]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="map-box fallback">
      <strong>Map preview</strong>
      <p>Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your <code>.env</code> file to see the live Google Map and route.</p>
      {rider && <p className="muted">Rider at {rider.lat.toFixed(4)}, {rider.lng.toFixed(4)} · {km.toFixed(1)} km to destination</p>}
    </div>
  );
}
