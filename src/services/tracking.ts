import type { LatLng, Rider } from "../types";
import { load, save } from "./db";

export const RIDER_ID = "rider-1";
const KEY = "swiftora_rider";
const DEFAULT: Rider = { id: RIDER_ID, name: "Ponnanna", online: false, location: { lat: 12.93, lng: 77.62 }, updated_at: new Date().toISOString() };

export const getRider = (): Rider => load<Rider>(KEY, DEFAULT);
export const setOnline = (online: boolean) => save(KEY, { ...getRider(), online });
export const updateRiderLocation = (location: LatLng) =>
  save(KEY, { ...getRider(), location, updated_at: new Date().toISOString() });

let simulating = false;

// Real GPS sharing while the rider is online. Returns a stop function.
export function startLocationSharing(): () => void {
  if (!("geolocation" in navigator)) return () => {};
  const id = navigator.geolocation.watchPosition(
    (p) => { if (!simulating) updateRiderLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); },
    () => {}, { enableHighAccuracy: true, maximumAge: 5000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

// Demo helper: glides the rider to a point so you can show live tracking without driving.
export function simulateMove(to: LatLng, steps = 30, ms = 1000): () => void {
  const from = getRider().location ?? to;
  let i = 0;
  simulating = true;
  const stop = () => { clearInterval(timer); simulating = false; };
  const timer = setInterval(() => {
    i++;
    const t = i / steps;
    updateRiderLocation({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t });
    if (i >= steps) stop();
  }, ms);
  return stop;
}
