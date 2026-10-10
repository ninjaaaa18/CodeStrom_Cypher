// Tiny localStorage "database" so the rider app works before the real backend exists.
// Person 4: replace load/save/subscribe usage in orders.ts and tracking.ts with Supabase calls.
const EVT = "swiftora-update";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

export function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVT));
}

export function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb); // updates from other browser tabs (customer tab!)
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}
