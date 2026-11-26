"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { frameAt, type SpriteAnimation } from "./sprite-frames";
import { useSettings } from "@/lib/settings_hook";

// One shared clock for every animated avatar on screen, running only while
// something is subscribed to it.
const TICK_MS = 60;
let clock = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!timer) {
    timer = setInterval(() => {
      clock += TICK_MS;
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** The in-app setting (mirrored onto <html>) or the OS preference. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.reduceMotion === "true" ||
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * Current frame index for `anim`. Each avatar gets a random phase so a row of
 * them doesn't blink in unison. `active` false parks it on frame 0.
 */
export function useSpriteFrame(anim: SpriteAnimation | undefined, active: boolean): number {
  const [phase] = useState(() => Math.floor(Math.random() * 6000));
  const { reduceMotion } = useSettings();
  const run = !!anim && active && !reduceMotion && !prefersReducedMotion();
  const idle = useRef(() => () => {});
  return useSyncExternalStore(
    run ? subscribe : idle.current,
    () => (run ? frameAt(anim!, clock + phase) : 0),
    () => 0,
  );
}

/** True while the pointer is over the avatar's button (or the avatar itself). */
export function useHostHover(ref: React.RefObject<Element | null>, enabled: boolean): boolean {
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const host = ref.current.closest("button, [data-avatar-host]") ?? ref.current;
    const on = () => setHover(true);
    const off = () => setHover(false);
    host.addEventListener("mouseenter", on);
    host.addEventListener("mouseleave", off);
    return () => {
      host.removeEventListener("mouseenter", on);
      host.removeEventListener("mouseleave", off);
    };
  }, [ref, enabled]);
  return enabled ? hover : false;
}

/**
 * Plays `anim` once from the start whenever `playing` turns true and returns
 * the frame to show (or null when not playing). Calls `onDone` at the end.
 */
export function useOneShot(anim: SpriteAnimation | undefined, playing: boolean, onDone?: () => void): number | null {
  const [frame, setFrame] = useState<number | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!anim || !playing || prefersReducedMotion()) {
      setFrame(null);
      if (playing) done.current?.();
      return;
    }
    const start = performance.now();
    setFrame(frameAt(anim, 0));
    const id = setInterval(() => {
      const elapsed = performance.now() - start;
      if (elapsed >= anim.total) {
        clearInterval(id);
        setFrame(null);
        done.current?.();
      } else {
        setFrame(frameAt(anim, elapsed));
      }
    }, 40);
    return () => clearInterval(id);
  }, [anim, playing]);
  return frame;
}
