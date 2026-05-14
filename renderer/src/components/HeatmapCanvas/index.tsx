"use client";

import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  useMemo,
} from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import {
  axisBottom,
  interpolateRgb,
  max,
  scaleLinear,
  scaleSequential,
  select,
} from "d3";
import { useResults } from "@/lib/result-provider";
import { useProfileTimezone } from "@/lib/profile-timezone";
import { KeyboardCanvas } from "@/components/KeyboardCanvas";

type TimeRange = "7d" | "30d" | "all";

interface HeatmapCanvasProps {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

function getDateCutoff(timeRange: TimeRange, tz: string): Temporal.Instant | null {
  if (timeRange === "all") return null;
  const days = timeRange === "7d" ? 7 : 30;
  // Subtract calendar days in the user's profile timezone — `{hours: days*24}`
  // ignores DST, so on a "spring forward" Sunday the 7-day window would shave
  // off an hour at the edge and risk dropping a session.
  return Temporal.Now.zonedDateTimeISO(tz).subtract({ days }).toInstant();
}

type ResizerAction = { type: "RESIZE" } | { type: "PR" };
interface ResizerState { width: number; height: number; pr: number }

const resizer = (state: ResizerState, action: ResizerAction) => {
  switch (action.type) {
    case "RESIZE": return { ...state, width: 1000, height: 50 };
    case "PR": return { ...state, pr: window.devicePixelRatio };
    default: return state;
  }
};

export function HeatmapCanvas({ keyboardName, timeRange }: HeatmapCanvasProps) {
  const scaleRef = useRef<HTMLCanvasElement>(null);
  const axisRef = useRef<SVGSVGElement>(null);
  const [{ pr }, resizeDispatch] = useReducer(resizer, { width: 1000, height: 50, pr: 1 });
  const { results } = useResults();
  const tz = useProfileTimezone();

  useLayoutEffect(() => {
    const updatePr = () => {
      resizeDispatch({ type: "PR" });
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
        "change", updatePr, { once: true },
      );
    };
    updatePr();
  }, []);

  const { colorMap, domain } = useMemo(() => {
    const cutoff = getDateCutoff(timeRange, tz);
    const keyResults = results
      .filter((res) => {
        if (res.keyboard !== keyboardName) return false;
        if (cutoff && Temporal.Instant.compare(Temporal.Instant.from(res.datetime), cutoff) < 0) return false;
        return true;
      })
      .reduce((acc, result) => {
        result.keyPresses?.forEach((keyPress) => {
          if (!acc.has(keyPress.key)) acc.set(keyPress.key, { correct: 0, incorrect: 0 });
          const k = acc.get(keyPress.key)!;
          keyPress.correct ? (k.correct += 1) : (k.incorrect += 1);
        });
        return acc;
      }, new Map<string, { correct: number; incorrect: number }>());

    const maxIncorrect = max(Array.from(keyResults.values()).map((v) => v.incorrect)) ?? 1;
    const domain: [number, number] = [0, maxIncorrect];
    const colorScale = scaleSequential()
      .interpolator(interpolateRgb("rgba(0,0,0,0.5)", "rgba(255,0,0,1)"))
      .domain(domain);

    const colorMap = new Map<string, string>();
    keyResults.forEach((value, key) => {
      colorMap.set(key, colorScale(value.incorrect));
    });

    return { colorMap, domain };
  }, [results, keyboardName, timeRange, tz]);

  // Draw the gradient scale bar
  useLayoutEffect(() => {
    if (!scaleRef.current) return;
    const ctx = scaleRef.current.getContext("2d");
    if (!ctx) return;
    scaleRef.current.style.width = `1000px`;
    scaleRef.current.style.height = `50px`;
    scaleRef.current.width = 1000 * pr;
    scaleRef.current.height = 50 * pr;

    if (domain[1] === 0) return;

    const colorScale = scaleSequential()
      .interpolator(interpolateRgb("rgba(0,0,0,0.5)", "rgba(255,0,0,1)"))
      .domain([0, 100]);

    const gradient = ctx.createLinearGradient(0, 0, 1000 * pr, 0);
    for (let i = 0; i <= 100; i++) {
      gradient.addColorStop(i / 100, colorScale(i));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000 * pr, 50 * pr);

    const axisScale = scaleLinear().domain(domain).range([0, 1000]);
    const axis = axisBottom(axisScale)
      .tickValues([0, domain[1] * 0.25, domain[1] * 0.5, domain[1] * 0.75, domain[1]])
      .tickFormat((d) => `${d}`);

    const svg = select(axisRef.current);
    svg.attr("width", 1050).attr("height", 20);
    svg.select(".axis").remove();
    svg.append("g").attr("class", "axis").attr("transform", "translate(25,0)").call(axis);

    return () => {
      ctx.clearRect(0, 0, 1000 * pr, 50 * pr);
      svg.selectAll("*").remove();
    };
  }, [domain, pr]);

  return (
    <>
      <KeyboardCanvas keyboardName={keyboardName} colorMap={colorMap} />
      <canvas ref={scaleRef} className="mx-auto" />
      <svg ref={axisRef} className="mx-auto" />
    </>
  );
}
