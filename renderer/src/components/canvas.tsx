import React, { useEffect, useReducer, useRef, useState } from "react";
import { drawKey, KEYS } from "../lib/canvas_utils";

// @ts-ignore
import RobotoMono from "../assets/RobotoMono-Regular.ttf";

const resizer = (state, action) => {
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

const Canvas = ({ letters, keyDown, keys, intervalFn }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [{ width, height, pr }, resizeDispatch] = useReducer(resizer, {
    width: 0,
    height: 0,
    pr: 1,
  });
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
        { once: true }
      );
    };
    updatePixelRatio();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  const [fontLoaded, setFontLoaded] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    // console.log(RobotoMono);
    new FontFace("Roboto Mono", `url(${RobotoMono})`)
      .load()
      .then(function (font) {
        document.fonts.add(font);
        setFontLoaded(true)
      });

    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    canvasRef.current.width = width * pr;
    canvasRef.current.height = height * pr;
    // ctx.scale(pr, pr);

    KEYS.forEach((row, i) =>
      row.forEach((letter, j) => {
        drawKey(
          ctx,
          i,
          j,
          typeof letter === "string" ? letter : letter.key,
          "rgba(0, 0, 0, 0.5)"
        );
      })
    );

    return () => {
      ctx.clearRect(0, 0, width * pr, height * pr);
    };
  }, [width, height, pr, fontLoaded]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const interval = setInterval(intervalFn, 500);

    // const keyDown = (e: KeyboardEvent) => {
    //   // dispatch({ type: "CORRECT", key: e.key });
    // };

    let requestId: number;
    const animate = (time: number) => {
      const uniqueChars = keys.current.reverse().filter((c, index) => {
        return keys.current.findIndex((i) => i.key === c.key) === index;
      });

      const keyz = uniqueChars.map((key) => {
        const x = 255 - (255 - key.ttl);
        if (key.correct)
          drawKey(ctx, key.i, key.j, key.key, `rgba(0, ${x}, 0, 0.5)`);
        else drawKey(ctx, key.i, key.j, key.key, `rgba(${x}, 0, 0, 0.5)`);
        return { ...key, ttl: key.ttl - 7 };
      });

      keyz
        .filter((key) => key.ttl <= 0)
        .forEach((key) => {
          // TODO: clear key
          drawKey(ctx, key.i, key.j, key.key, "rgba(0, 0, 0, 0.5)");
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
  }, [letters, pr, keyDown, intervalFn, keys]);

  return <canvas ref={canvasRef} />;
};

export default Canvas;
