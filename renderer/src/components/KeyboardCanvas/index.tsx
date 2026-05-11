"use client";

import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { KeyboardLayoutNames, lookupKeyboard } from "@/keyboards";
import { Keyboard } from "@/keyboards/key";

// @ts-ignore
import RobotoMono from "@/assets/RobotoMono-Regular.ttf";
// @ts-ignore
import FontAwesomeRegular from "@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-regular-400.ttf";
// @ts-ignore
import FontAwesomeSolid from "@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-solid-900.ttf";

type ResizerAction = { type: "RESIZE" } | { type: "PR" };
interface ResizerState {
  width: number;
  height: number;
  pr: number;
}

const marginWidth = 120;
const marginHeight = 350;

const resizer = (state: ResizerState, action: ResizerAction) => {
  switch (action.type) {
    case "RESIZE":
      return {
        ...state,
        width: window.innerWidth - marginWidth,
        height: window.innerHeight - marginHeight,
      };
    case "PR":
      return { ...state, pr: window.devicePixelRatio };
    default:
      return state;
  }
};

export interface KeyboardCanvasProps {
  keyboardName: KeyboardLayoutNames;
  /**
   * Maps Key.key string (e.g. "e", "shift") to a CSS colour string.
   * Keys absent from the map are drawn in the default base colour.
   */
  colorMap: Map<string, string>;
  onKeyClick?: (key: string) => void;
}

export function KeyboardCanvas({
  keyboardName,
  colorMap,
  onKeyClick,
}: KeyboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [{ width, height, pr }, resizeDispatch] = useReducer(resizer, {
    width: 0,
    height: 0,
    pr: 1,
  });

  const keyboardLayout = lookupKeyboard(keyboardName);
  const keyboard = new Keyboard(keyboardLayout, 0.9);

  useLayoutEffect(() => {
    if (!fontLoaded) {
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
  }, []);

  useLayoutEffect(() => {
    const resize = () => resizeDispatch({ type: "RESIZE" });
    window.addEventListener("resize", resize);
    resize();

    const updatePixelRatio = () => {
      resizeDispatch({ type: "PR" });
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
        "change",
        updatePixelRatio,
        { once: true },
      );
    };
    updatePixelRatio();

    return () => window.removeEventListener("resize", resize);
  }, []);

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    canvasRef.current.width = width * pr;
    canvasRef.current.height = height * pr;

    keyboard.drawKeyboard(ctx);

    colorMap.forEach((color, key) => {
      if (!keyboard.keyExists(key)) return;
      const [i, j] = keyboard.findIndex(key);
      const keyObj = keyboard.findKey(key);
      keyboard.drawKey(ctx, i, j, keyObj, color);
    });

    return () => {
      ctx.clearRect(0, 0, width * pr, height * pr);
    };
  }, [width, height, pr, fontLoaded, keyboardName, colorMap]);

  // Click hit-testing: mirrors the coordinate math in Keyboard.drawKey
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onKeyClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const scale = 0.9;
      const keyboardLength = keyboard.getRowWidth(0);
      // drawKey centers relative to window.innerWidth (mirrors Keyboard.drawKey offset calc)
      const baseOffset = (window.innerWidth - keyboardLength) / 2;

      for (let i = 0; i < keyboard.rows.length; i++) {
        const row = keyboard.rows[i];
        // Mirrors drawKey: y = (i * (80 + this.gap)) * scale, then makeKey adds +20
        // keyboard.gap is already scaled (4.5), so: i * (80 + 4.5) * 0.9 + 20
        const keyTop = i * (80 + keyboard.gap) * scale + 20;
        const keyBottom = keyTop + 80 * scale;
        if (clickY < keyTop || clickY > keyBottom) continue;

        // Mirrors drawKey's x accumulation: raw widths + scaled gaps
        // drawKey: for q < j: x += key.width (raw) + this.gap (scaled = 4.5)
        // then key is drawn at (x + offset) * scale in CSS pixels
        let xRaw = 0;
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          const key = Array.isArray(cell) ? cell[0] : cell;
          const kw = (key.width || 80) * scale;
          // drawKey positions the key at CSS coord (xRaw + baseOffset) * scale
          // where baseOffset = (window.innerWidth - rowWidth) / 2
          // The canvas element starts at rect.left in the viewport.
          // makeKey renders at that CSS coord relative to the canvas origin,
          // so the key's left edge in CSS pixels within the canvas is that value.
          const keyLeftInCanvas = (xRaw + baseOffset) * scale;
          if (clickX >= keyLeftInCanvas && clickX < keyLeftInCanvas + kw) {
            onKeyClick(key.key);
            return;
          }
          xRaw += key.width || 80;
          xRaw += keyboard.gap; // gap already scaled (= 5 * 0.9 = 4.5)
        }
      }
    },
    [onKeyClick, keyboard],
  );

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto"
      onClick={onKeyClick ? handleClick : undefined}
      style={onKeyClick ? { cursor: "pointer" } : undefined}
    />
  );
}
