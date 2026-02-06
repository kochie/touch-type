"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { KeyboardLayoutNames, lookupKeyboard } from "@/keyboards";
import { Keyboard } from "@/keyboards/key";
import {
  axisBottom,
  interpolateRgb,
  max,
  scaleLinear,
  scaleSequential,
  select,
} from "d3";

// @ts-ignore
import RobotoMono from "@/assets/RobotoMono-Regular.ttf";
// @ts-ignore
import FontAwesomeRegular from "@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-regular-400.ttf";
// @ts-ignore
import FontAwesomeSolid from "@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-solid-900.ttf";
import { useResults } from "@/lib/result-provider";

type ResizerAction = { type: "RESIZE" } | { type: "PR" };
interface ResizerState {
  width: number;
  height: number;
  pr: number;
}

const marginWidth = 120;
const marginHeight = 350;

// reducer for resizing the canvas
const resizer = (state: ResizerState, action: ResizerAction) => {
  switch (action.type) {
    case "RESIZE":
      return {
        ...state,
        width: window.innerWidth - marginWidth,
        // I can't remember why 228
        height: window.innerHeight - marginHeight,
      };
    case "PR":
      return {
        ...state,
        pr: window.devicePixelRatio,
      };
    default:
      return state;
  }
};

interface HeatmapCanvasProps {
  keyboardName: KeyboardLayoutNames;
}

export function HeatmapCanvas({ keyboardName }: HeatmapCanvasProps) {
  // create a ref elemebt for the canvas to be used in the component
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef<HTMLCanvasElement>(null);
  const keyboardLayout = lookupKeyboard(keyboardName);
  const [fontLoaded, setFontLoaded] = useState(false);
  const keyboard = new Keyboard(keyboardLayout, 0.9);
  const axisRef = useRef<SVGSVGElement>(null);

  const { results } = useResults();
  const [{ width, height, pr }, resizeDispatch] = useReducer(resizer, {
    width: 0,
    height: 0,
    pr: 1,
  });
  // Inital render setup
  useLayoutEffect(() => {
    const resize = () => {
      resizeDispatch({ type: "RESIZE" });
    };
    window.addEventListener("resize", resize);
    resize();

    const updatePixelRatio = () => {
      let pr = window.devicePixelRatio;
      resizeDispatch({ type: "PR" });
      matchMedia(`(resolution: ${pr}dppx)`).addEventListener(
        "change",
        updatePixelRatio,
        { once: true },
      );
    };
    updatePixelRatio();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  const generateDomain = useCallback(() => {
    const keyResults = results
      .filter((res) => res.keyboard === keyboardName)
      .reduce((acc, result) => {
        result.keyPresses?.forEach((keyPress) => {
          if (!acc.has(keyPress.key)) {
            acc.set(keyPress.key, { correct: 0, incorrect: 0 });
          }
          const key = acc.get(keyPress.key)!;
          if (keyPress.correct) {
            key.correct += 1;
          } else {
            key.incorrect += 1;
          }
          acc.set(keyPress.key, key);
        });
        return acc;
      }, new Map<string, { correct: number; incorrect: number }>());

    return [0, max(Array.from(keyResults.values()).map((v) => v.incorrect))!];
  }, [results, keyboardName]);

  // Draw the keyboard on the canvas
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    canvasRef.current.width = width * pr;
    canvasRef.current.height = height * pr;

    loadAndSetFonts();
    keyboard.drawKeyboard(ctx);
    generateHeatmap(ctx);

    return () => {
      ctx.clearRect(0, 0, width * pr, height * pr);
    };
  }, [width, height, pr, fontLoaded, keyboardLayout, results]);

  useLayoutEffect(() => {
    // Draw the scale
    if (!scaleRef.current) return;
    const ctx = scaleRef.current.getContext("2d");
    if (!ctx) return;
    scaleRef.current.style.width = `${1000}px`;
    scaleRef.current.style.height = `${50}px`;
    scaleRef.current.width = 1000 * pr;
    scaleRef.current.height = 50 * pr;

    const colorScale = scaleSequential()
      .interpolator(interpolateRgb("rgba(0,0,0,0.5)", "rgba(255,0,0,1)"))
      .domain([0, 100]);

    const gradient = ctx.createLinearGradient(0, 0, 1000 * pr, 0);
    for (let i = 0; i <= 100; i++) {
      gradient.addColorStop(i / 100, colorScale(i));
    }

    const domain = generateDomain()
    if (domain[1] === undefined) return

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000 * pr, 50 * pr);

    const axisScale = scaleLinear()
      .domain(domain)
      .range([0, 1000]);


    const axis = axisBottom(axisScale)
      .tickValues([0, domain[1]*0.25, domain[1]*0.5, domain[1]*0.75, domain[1]])
      .tickFormat((d) => `${d}`);

    const svg = select(axisRef.current);
    svg.attr("width", 1050).attr("height", 20);

    svg.select(".axis").remove(); // Remove previous axis if any
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", "translate(25,0)")
      .call(axis);

    return () => {
      ctx.clearRect(0, 0, 1000 * pr, 50 * pr);
      svg.selectAll("*").remove();
    }
  }, [generateDomain]);

  return (
    <>
      <canvas ref={canvasRef} className="mx-auto" />
      <canvas ref={scaleRef} className="mx-auto" />
      <svg ref={axisRef} className="mx-auto" />
    </>
  );

  function generateHeatmap(ctx: CanvasRenderingContext2D) {
    const keyResults = results
      .filter((res) => res.keyboard === keyboardName)
      .reduce((acc, result) => {
        result.keyPresses?.forEach((keyPress) => {
          if (!acc.has(keyPress.key)) {
            acc.set(keyPress.key, { correct: 0, incorrect: 0 });
          }
          const key = acc.get(keyPress.key)!;
          if (keyPress.correct) {
            key.correct += 1;
          } else {
            key.incorrect += 1;
          }
          acc.set(keyPress.key, key);
        });
        return acc;
      }, new Map<string, { correct: number; incorrect: number }>());

    const colorScale = scaleSequential()
      .interpolator(interpolateRgb("rgba(0,0,0,0.5)", "rgba(255,0,0,1)"))
      // This needs to be the scale of correct vs incorrect
      .domain(generateDomain());

    keyResults.forEach((value, k) => {
      // Skip keys that don't exist on the current keyboard layout
      if (!k || !keyboard.keyExists(k)) return;
      
      const [i, j] = keyboard.findIndex(k);
      const key = keyboard.findKey(k);
      keyboard.drawKey(ctx, i, j, key, colorScale(value.incorrect));
    });
  }

  function loadAndSetFonts() {
    if (!fontLoaded)
      Promise.all([
        new FontFace("Roboto Mono", `url(${RobotoMono})`).load(),
        new FontFace("FontAwesome", `url(${FontAwesomeSolid})`, {
          weight: "900",
        }).load(),
        new FontFace("FontAwesome", `url(${FontAwesomeRegular})`, {
          weight: "400",
        }).load(),
      ]).then((fonts) => {
        fonts.forEach((font) => document.fonts.add(font));
        setFontLoaded(true);
      });
  }
}
