import React, { MutableRefObject, useEffect, useReducer, useRef, useState } from "react";
// import { KEYS } from "../../lib/canvas_utils";

// @ts-ignore
import RobotoMono from "@/assets/RobotoMono-Regular.ttf";
// @ts-ignore
import FontAwesomeRegular from "@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-regular-400.ttf";
// @ts-ignore
import FontAwesomeSolid from "@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-solid-900.ttf";
import { useSettings } from "@/lib/settings_hook";
import { Keyboard } from "@/keyboards/key";
import { lookupKeyboard } from "@/keyboards";
import { LetterStat } from "../Tracker/reducers";
import { CurrentKeyRef, KeyPress } from "../Tracker";

type ResizerAction = { type: "RESIZE" } | { type: "PR" };
interface ResizerState {
  width: number;
  height: number;
  pr: number;
}

const resizer = (state: ResizerState, action: ResizerAction) => {
  switch (action.type) {
    case "RESIZE":
      return {
        ...state,
        width: window.innerWidth,
        height: window.innerHeight - 228,
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

interface CanvasProps {
  letters: LetterStat[];
  keyDown: (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => void;
  keys: MutableRefObject<KeyPress[]>;
  intervalFn: () => void;
  currentKey?: CurrentKeyRef;
}

const Canvas = ({ letters, keyDown, keys, intervalFn, currentKey }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [{ width, height, pr }, resizeDispatch] = useReducer(resizer, {
    width: 0,
    height: 0,
    pr: 1,
  });

  const settings = useSettings();
  const keyboardLayout = lookupKeyboard(settings.keyboardName);

  useEffect(() => {
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

  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    const keyboard = new Keyboard(keyboardLayout);
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

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

    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    canvasRef.current.width = width * pr;
    canvasRef.current.height = height * pr;

    keyboard.drawKeyboard(ctx, !settings.punctuation);

    return () => {
      ctx.clearRect(0, 0, width * pr, height * pr);
    };
  }, [width, height, pr, fontLoaded, keyboardLayout]);

  useEffect(() => {
    const keyboard = new Keyboard(keyboardLayout);
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const interval = setInterval(intervalFn, 500);

    let requestId: number;
    const animate = (time: number) => {
      ctx.clearRect(0, 0, width * pr, height * pr);
      keyboard.drawKeyboard(ctx, !settings.punctuation);

      const uniqueChars = keys.current.reverse().filter((c, index) => {
        return keys.current.findIndex((i) => i.key === c.key) === index;
      });

      if (currentKey && settings.blinker) {
        const t = 1 - (time % 1500) / 1500;

        const x = 255 - 255 * (1 - t);
        keyboard.drawKey(ctx, currentKey.i, currentKey.j, currentKey.current, `rgba(0, 0, ${x}, 0.5)`);
      }

      const keyz = uniqueChars.map((key) => {
        const x = 255 - (255 - key.ttl);
        if (key.correct)
          keyboard.drawKey(ctx, key.i, key.j, key.key, `rgba(0, ${x}, 0, 0.5)`);
        else
          keyboard.drawKey(ctx, key.i, key.j, key.key, `rgba(${x}, 0, 0, 0.5)`);
        return { ...key, ttl: key.ttl - 7 };
      });

      keyz
        .filter((key) => key.ttl <= 0)
        .forEach((key) => {
          // TODO: clear key
          keyboard.drawKey(ctx, key.i, key.j, key.key, "rgba(0, 0, 0, 0.5)");
        });

      keys.current = keyz.filter((key) => key.ttl > 0);
      

      requestId = window.requestAnimationFrame(animate);
    };
    requestId = window.requestAnimationFrame(animate);

    const onKeyDown = (e: KeyboardEvent) => keyDown(e, ctx);
    addEventListener("keydown", onKeyDown);
    // addEventListener("keyup", keyUp);
    // addEventListener("keydown", keyDown);
    return () => {
      // removeEventListener("keyup", keyUp);
      removeEventListener("keydown", onKeyDown);
      clearInterval(interval);
      window.cancelAnimationFrame(requestId);
    };
  }, [letters, pr, keyDown, intervalFn, keys, keyboardLayout, currentKey]);

  return <canvas ref={canvasRef} />;
};

export default Canvas;
