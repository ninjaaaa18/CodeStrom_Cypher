import { useEffect, useState } from "react";
import { subscribe } from "../services/db";

// Re-reads data whenever any tab/page changes it (acts like "real-time").
export function useLive<T>(read: () => T): T {
  const [value, setValue] = useState<T>(read);
  useEffect(() => subscribe(() => setValue(read())), []); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}
