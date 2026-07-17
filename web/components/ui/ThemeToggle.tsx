"use client";

import { useState, useEffect } from "react";
import { Button } from "./Button";

/** Toggles the `.light` class on <html> — dark is the default per Design.md. */
export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  return (
    <Button variant="secondary" className="text-xs px-2.5 py-1" onClick={() => setIsLight(!isLight)}>
      {isLight ? "Dark Mode" : "Light Mode"}
    </Button>
  );
}
