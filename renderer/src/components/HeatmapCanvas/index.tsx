"use client";

import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { KeyboardLayoutNames, lookupKeyboard } from "@/keyboards";
import { Keyboard } from "@/keyboards/key";
import { interpolateRgb, max, scaleSequential } from "d3";

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
const marginHeight = 380;

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
  }, [width, height, pr, fontLoaded, keyboardLayout]);

  useLayoutEffect(() => {
    if (!scaleRef.current) return;
    const ctx = scaleRef.current.getContext("2d");
    if (!ctx) return;
    scaleRef.current.style.width = `${500}px`;
    scaleRef.current.style.height = `${100}px`;
    scaleRef.current.width = 500 * pr;
    scaleRef.current.height = 100 * pr;

    const colorScale = scaleSequential()
      .interpolator(interpolateRgb("rgba(0,255,0,0)", "rgba(255,0,0,1)"))
      .domain([0, 100]);

    const gradient = ctx.createLinearGradient(0, 0, 500 * pr, 0);
    for (let i = 0; i <= 100; i++) {
      gradient.addColorStop(i / 100, colorScale(i));
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500 * pr, 100 * pr);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="mx-auto" />
      <canvas ref={scaleRef} />
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
      .interpolator(interpolateRgb("rgba(0,255,0,0)", "rgba(255,0,0,1)"))
      // This needs to be the scale of correct vs incorrect
      .domain([
        0,
        max(Array.from(keyResults.values()).map((v) => v.incorrect))!,
      ]);

    keyResults.forEach((value, k) => {
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
