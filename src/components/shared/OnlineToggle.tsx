import { useLive } from "../../hooks/useLive";
import { getRider, setOnline } from "../../services/tracking";

export default function OnlineToggle() {
  const rider = useLive(getRider);
  return (
    <button className={`toggle ${rider.online ? "on" : ""}`} onClick={() => setOnline(!rider.online)}
      role="switch" aria-checked={rider.online} aria-label="Availability">
      <span className="knob" />
      <span className="toggle-label">{rider.online ? "Online" : "Offline"}</span>
    </button>
  );
}
