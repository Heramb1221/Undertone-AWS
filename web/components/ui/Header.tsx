"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api, Circle } from "@/lib/api";
import { getLocalIdentity, LocalIdentity } from "@/lib/localIdentity";
import { signOut } from "@/lib/cognito";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

export function Header() {
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIdentity(getLocalIdentity());

    // Pre-load circles for the search bar
    api.listCircles()
      .then(setCircles)
      .catch((err) => console.warn("Failed to load circles for search header:", err));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    signOut();
    localStorage.removeItem("undertone_identity");
    window.location.href = "/";
  }

  // Filter circles based on search query
  const filteredCircles = searchQuery.trim()
    ? circles.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md" style={{ borderColor: "var(--border-subtle)", background: "rgba(22, 11, 5, 0.8)" }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        
        {/* Left Side: Logo & Profile */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="font-display font-bold text-lg tracking-tight mr-2" style={{ color: "var(--text-primary)" }}>
            undertone
          </Link>
          {identity && (
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Avatar seed={identity.name} size={28} />
              <span className="text-xs font-medium hidden sm:inline" style={{ color: "var(--text-primary)" }}>
                {identity.name}
              </span>
            </Link>
          )}
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md relative" ref={dropdownRef}>
          <input
            type="text"
            placeholder="Search circles…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full px-3 py-1.5 rounded-md border text-sm bg-transparent outline-none transition-colors focus:border-accent-primary"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)", background: "var(--bg-elevated)" }}
          />

          {showDropdown && searchQuery.trim() !== "" && (
            <div className="absolute top-11 left-0 w-full border rounded-md shadow-lg overflow-hidden py-1 z-50 max-h-60 overflow-y-auto" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
              {filteredCircles.length > 0 ? (
                filteredCircles.map((circle) => (
                  <Link
                    key={circle.circle_id}
                    href={`/circles/${circle.circle_id}`}
                    onClick={() => {
                      setSearchQuery("");
                      setShowDropdown(false);
                    }}
                    className="block px-4 py-2 text-sm hover:bg-neutral-800 transition-colors text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div className="font-medium">t/{circle.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{circle.description}</div>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-2.5 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                  No circles match &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Links & Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/circles" className="text-xs font-medium hover:underline hidden md:inline" style={{ color: "var(--text-secondary)" }}>
            Explore Circles
          </Link>
          <Link href="/circles/new">
            <Button variant="secondary" className="text-xs px-2.5 py-1">
              Create Circle
            </Button>
          </Link>
          <Link href="/dm">
            <Button variant="secondary" className="text-xs px-2.5 py-1">
              Messages
            </Button>
          </Link>
          <Button variant="secondary" className="text-xs px-2.5 py-1" onClick={handleLogout}>
            Log out
          </Button>
        </div>

      </div>
    </header>
  );
}
