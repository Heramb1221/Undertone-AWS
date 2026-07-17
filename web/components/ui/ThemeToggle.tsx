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
    <Button variant="secondary" onClick={() => setIsLight(!isLight)}>
      Switch to {isLight ? "dark" : "light"} mode
    </Button>
  );
}
