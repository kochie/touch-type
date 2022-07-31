import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
// @ts-ignore
import wordFile from "../assets/words.txt";
import samplesize from "lodash.samplesize";
import { DateTime, Interval } from "luxon";

import useSWR from "swr";

// import { readFile } from "fs/promises";
// const { readFile } = promises;

const KEYS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
  [" "],
];

const OFFSETS = [0, 0, 60, 140, 500];
const GAP = 10;

// const getWords = async () => {
//   const words = await readFile(wordFile);
//   console.log(words);
//   return words.toString().split("\n");
// };

interface IndexProps {
  wordList: string[];
}

const resizer = (state, action) => {
  switch (action.type) {
    case "RESIZE":
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    default:
      return state;
  }
};

const reducer = (state, action) => {
  switch (action.type) {
    case "CORRECT":
      return [...state, { correct: true, key: action.key }];
    case "INCORRECT":
      return [...state, { key: action.key, correct: false }];
    case "BACKSPACE": {
      // console.log("BB");
      return [...state.slice(0, -1)];
    }
    case "RESET":
      return [];
    default:
      return state;
  }
};

const statsReducer = (state, action) => {
  switch (action.type) {
    case "CORRECT":
      return {
        ...state,
        correct: state.correct + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
      };
    case "INCORRECT":
      return {
        ...state,
        incorrect: state.incorrect + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
      };
    case "RESET":
      return {
        correct: 0,
        incorrect: 0,
        start: DateTime.now(),
        time: Interval.after(DateTime.now(), 0),
      };
    case "TICK":
      return {
        ...state,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
      };
    default:
      return state;
  }
};

const IndexPage = ({ wordList }: IndexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [{ width, height }, resizeDispatch] = useReducer(resizer, {
    width: 0,
    height: 0,
  });

  const [words, setWords] = useState("");

  const [{ correct, incorrect, time }, statsDispatch] = useReducer(
    statsReducer,
    {
      correct: 0,
      incorrect: 0,
      time: Interval.after(DateTime.now(), 0),
      start: DateTime.now(),
    }
  );

  const [letters, dispatch] = useReducer(reducer, []);
  // const [index, setIndex] = useState(0);

  // const { data, error } = useSWR("/api/user", () => {});

  // console.log(words);
  // const [text, setText] = useState("");
  // const text = words[0];

  useEffect(() => {
    const resize = () => {
      // setWidth(window.innerWidth * 0.9);
      // setHeight(window.innerHeight * 0.9);
      resizeDispatch({ type: "RESIZE" });
    };
    window.addEventListener("resize", resize);
    resize();
    const interval = setInterval(() => {
      statsDispatch({ type: "TICK" });
    }, 1000);

    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setWords(samplesize(wordList, 15).join(" "));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    // ctx.scale(-10, 10);

    const keyDown = (e: KeyboardEvent) => {
      // console.log(e.key);
      if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;
      // e.preventDefault();
      const [i, j] = findKey(e.key);
      // console.log(i, j);
      drawKey(ctx, i, j, e.key, "blue");
    };

    const keyUp = (e: KeyboardEvent) => {
      if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;
      const [i, j] = findKey(e.key);
      drawKey(ctx, i, j, e.key, "white");
    };

    addEventListener("keydown", keyDown);
    addEventListener("keyup", keyUp);

    console.log(width, height);

    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    canvasRef.current.width = width * window.devicePixelRatio;
    canvasRef.current.height = height * window.devicePixelRatio;

    KEYS.forEach((row, i) =>
      row.forEach((letter, j) => {
        drawKey(ctx, i, j, letter, "white");
      })
    );

    return () => {
      // console.log("cleanup");
      ctx.clearRect(0, 0, width, height);
      removeEventListener("keydown", keyDown);
      removeEventListener("keyup", keyUp);
    };
  }, [width, height]);

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      // console.log(e.key);
      if (e.key === "Backspace") dispatch({ type: "BACKSPACE" });
      if (e.key === "Escape") {
        setWords(samplesize(wordList, 15).join(" "));
        dispatch({ type: "RESET" });
        statsDispatch({ type: "RESET" });
      }
      e.preventDefault();

      if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;
      // console.log(letters.length);

      if (e.key === words[letters.length]) {
        dispatch({ type: "CORRECT", key: words[letters.length] });
        statsDispatch({ type: "CORRECT" });
      } else {
        dispatch({ type: "INCORRECT", key: words[letters.length] });
        statsDispatch({ type: "INCORRECT" });
      }

      if (letters.length === words.length - 1) {
        setWords(samplesize(wordList, 15).join(" "));
        dispatch({ type: "RESET" });
        statsDispatch({ type: "RESET" });
      }
    };

    addEventListener("keydown", keyDown);
    return () => {
      removeEventListener("keydown", keyDown);
    };
  }, [letters]);

  const d = (time as Interval).toDuration();
  // console.log(d);

  return (
    <div className="w-screen h-screen">
      <div className="">
        <div className="flex gap-10 justify-center pt-10 font-mono">
          <p>Correct: {correct}</p>
          <p>Incorrect: {incorrect}</p>
          <p>Time: {d.toFormat("mm:ss")}</p>
        </div>
        <p className="font-mono text-center p-10">
          {letters.map((letter, i) => (
            <span
              key={i}
              className={letter.correct ? "bg-green-300" : "bg-red-500"}
            >
              {letter.key}
            </span>
          ))}
          <span className="bg-yellow-500">{words[letters.length]}</span>
          {words.substring(letters.length + 1, words.length)}
        </p>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export async function getStaticProps(context) {
  return {
    props: {
      wordList: wordFile
        .toString()
        .split("\n")
        .map((word) => word.toLowerCase()),
    }, // will be passed to the page component as props
  };
}

export default IndexPage;

function makeKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  letter: string,
  fillColor = "white",
  offset = 0
) {
  x += offset;

  y += 20;

  ctx.fillStyle = fillColor;
  roundRect(ctx, x, y, width, height, 25, true, true);
  ctx.fillStyle = "black";
  ctx.font = "60px monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(letter, x + width / 2, y + height / 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r = 5,
  fill = false,
  stroke = true
) {
  const radius = { tl: r, tr: r, br: r, bl: r };

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height
  );
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
}

function findKey(key: string): [number, number] {
  for (let i = 0; i < KEYS.length; i++) {
    const row = KEYS[i];
    // console.log(row);
    for (let j = 0; j < row.length; j++) {
      if (row[j] === key.toUpperCase()) {
        return [i, j];
      }
    }
  }
  return [0, 0];
}

const drawKey = (
  ctx: CanvasRenderingContext2D,
  i: number,
  j: number,
  letter: string,
  color: string
) => {
  const width = 175;
  const height = 175;

  const keyboardLength = width * KEYS[0].length + (KEYS[0].length - 1) * GAP;
  const offset =
    (window.innerWidth * window.devicePixelRatio - keyboardLength) / 2;
  console.log(keyboardLength, offset);

  if (letter === " ") {
    makeKey(
      ctx,
      j * (width + GAP) + OFFSETS[i],
      i * (height + GAP),
      900,
      height,
      "SPACE",
      color,
      offset
    );
  } else {
    makeKey(
      ctx,
      j * (width + GAP) + OFFSETS[i],
      i * (height + GAP),
      width,
      height,
      letter.toUpperCase(),
      color,
      offset
    );
  }
};
