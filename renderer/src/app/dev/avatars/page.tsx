"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay, faBug } from "@fortawesome/free-solid-svg-icons";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";
import { Confetti } from "@/components/avatars/UnlockCelebration";
import { FACE_ANIMATIONS, frameAt } from "@/components/avatars/sprite-frames";
import { VICTORY_ANIMATIONS } from "@/components/avatars/sprite-victory";
import { FACES, HATS } from "@/lib/avatars";

const SPEEDS = [0.25, 0.5, 1, 2];

/** Dev-only workbench for the avatar sprite animations. */
export default function AvatarDebugPage() {
  const [face, setFace] = useState("classic");
  const [hat, setHat] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [pinned, setPinned] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const [burst, setBurst] = useState(0);
  const [mode, setMode] = useState<"idle" | "victory">("idle");
  const [playVictory, setPlayVictory] = useState(false);
  const last = useRef<number | null>(null);

  const anim = mode === "victory" ? VICTORY_ANIMATIONS[face] : FACE_ANIMATIONS[face];

  useEffect(() => {
    if (!playing || pinned !== null) {
      last.current = null;
      return;
    }
    let raf = 0;
    const step = (now: number) => {
      if (last.current !== null) setClock((c) => c + (now - last.current!) * speed);
      last.current = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, pinned, speed]);

  if (process.env.NODE_ENV !== "development") {
    return <p className="p-8 text-sm text-gray-500">The avatar debug page is only available in development.</p>;
  }

  const frame = pinned ?? (anim ? frameAt(anim, clock) : 0);

  // Which timeline step are we in (for highlighting the script table)?
  let stepIndex = -1;
  if (anim) {
    let t = clock % anim.total;
    stepIndex = anim.timeline.findIndex(([, ms]) => (t < ms ? true : ((t -= ms), false)));
  }

  const resetSeen = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("touch-typer-seen-") || k.startsWith("touch-typer-new-unlocks:"))
      .forEach((k) => localStorage.removeItem(k));
    toast.success("Cleared seen/new unlock state. Reload to re-baseline.");
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {burst > 0 && <Confetti key={burst} onDone={() => setBurst(0)} />}
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
        <FontAwesomeIcon icon={faBug} className="h-4 w-4 text-amber-400" />
        Avatar animation workbench
        <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">dev only</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <div className="rounded-xl bg-slate-950 text-slate-100 p-3">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Faces</p>
          <div className="grid grid-cols-4 gap-2">
            {FACES.map((f) => (
              <button
                key={f.slug}
                title={f.name}
                onClick={() => { setFace(f.slug); setPinned(null); setClock(0); }}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border ${face === f.slug ? "border-violet-500 bg-violet-500/15" : "border-slate-800 bg-slate-900 hover:border-slate-600"}`}
              >
                <AvatarComposite face={f.slug} size={36} />
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">Hat</p>
          <select
            value={hat ?? "none"}
            onChange={(e) => setHat(e.target.value === "none" ? null : e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          >
            {HATS.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
          </select>
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={() => { setBurst((n) => n + 1); toast.success("New avatar item unlocked", { description: "Debug celebration" }); }} className="rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30">
              Fire unlock celebration
            </button>
            <button onClick={resetSeen} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">
              Reset seen unlocks
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6 rounded-xl bg-slate-950 text-slate-100 p-4">
            <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-slate-900">
              <AvatarComposite face={face} hat={hat} size={192} frame={playVictory ? undefined : frame} animation={mode} victory={playVictory} onVictoryEnd={() => setPlayVictory(false)} />
            </div>
            <div className="flex min-w-[14rem] flex-1 flex-col gap-3 text-sm">
              <div className="text-lg font-semibold">{FACES.find((f) => f.slug === face)?.name}</div>
              <div className="text-slate-400">
                frame <b className="text-slate-100">{anim?.labels[frame] ?? "static"}</b> ({frame + 1}/{anim?.frames.length ?? 1})
                {anim && <> · loop {(anim.total / 1000).toFixed(1)}s · offset [{anim.offsets[frame]?.join(", ")}]</>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPinned(null); setPlaying((p) => !p); }}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700"
                  aria-label={playing && pinned === null ? "Pause" : "Play"}
                >
                  <FontAwesomeIcon icon={playing && pinned === null ? faPause : faPlay} className="h-3.5 w-3.5" />
                </button>
                {SPEEDS.map((sp) => (
                  <button key={sp} onClick={() => setSpeed(sp)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${speed === sp ? "bg-violet-500/30 text-violet-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                    {sp}x
                  </button>
                ))}
                {pinned !== null && (
                  <button onClick={() => setPinned(null)} className="rounded-md bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300">Unpin</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(["idle", "victory"] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setPinned(null); setClock(0); }} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize ${mode === m ? "bg-violet-500/30 text-violet-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                    {m}
                  </button>
                ))}
                <button onClick={() => setPlayVictory(true)} className="rounded-md bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30">
                  Play victory once
                </button>
              </div>
              <p className="text-xs text-slate-500">Click a frame below to pin it; Unpin resumes the loop.</p>
            </div>
          </div>

          {anim && (
            <div className="rounded-xl bg-slate-950 text-slate-100 p-4">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Frames</p>
              <div className="flex flex-wrap gap-2">
                {anim.frames.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPlaying(false); setPinned(i); }}
                    className={`flex w-[4.5rem] flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] ${frame === i ? "border-amber-400 bg-amber-400/10" : "border-slate-800 bg-slate-900 hover:border-slate-600"} ${pinned === i ? "ring-1 ring-amber-300" : ""}`}
                  >
                    <AvatarComposite face={face} hat={hat} size={48} frame={i} animation={mode} />
                    <span className="truncate text-slate-400">{anim.labels[i]}</span>
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">Script</p>
              <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
                {anim.timeline.map(([f, ms], i) => (
                  <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] ${i === stepIndex && pinned === null ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-slate-400"}`}>
                    {anim.labels[f]} {ms}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-950 text-slate-100 p-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Every face, victory (frame 7)</p>
            <div className="flex flex-wrap gap-3">
              {FACES.map((f) => (
                <div key={f.slug} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
                  <AvatarComposite face={f.slug} hat={hat} size={96} frame={6} animation="victory" />
                  {f.name}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 text-slate-100 p-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Every face, idle</p>
            <div className="flex flex-wrap gap-3">
              {FACES.map((f) => (
                <div key={f.slug} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
                  <AvatarComposite face={f.slug} hat={hat} size={64} />
                  {f.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
