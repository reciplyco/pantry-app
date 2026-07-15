"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// ssr:false needs a client-component boundary — this is that boundary.
// Loaded only when JS is up and the user hasn't asked for reduced motion,
// so there's always a graceful fallback to the plain gradient hero.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function subscribe(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
  return false;
}

export default function HeroSceneLoader() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <HeroScene />
    </div>
  );
}
