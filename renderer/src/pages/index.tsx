import { useEffect, useReducer, useRef, useState } from "react";
import { DateTime, Interval } from "luxon";
import samplesize from "lodash.samplesize";
// @ts-ignore
import wordBlob from "../assets/words.txt";
import { keys, remove } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faGear } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

const KEYS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
  [" "],
];

const OFFSETS = [0, 0, 60, 140, 250];
const GAP = 5;

interface IndexProps {
  wordList: string[];
}

const resizer = (state, action) => {
  switch (action.type) {
    case "RESIZE":
      return {
        ...state,
        width: window.innerWidth,
        height: window.innerHeight - 192,
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

const reducer = (state, action) => {
  switch (action.type) {
    case "CORRECT":
      return [...state, { correct: true, key: action.key }];
    case "INCORRECT":
      return [...state, { key: action.key, correct: false }];
    case "BACKSPACE": {
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
    case "START":
      return {
        ...state,
        start: DateTime.now(),
      };
    case "RESET":
      return {
        correct: 0,
        incorrect: 0,
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
  const [{ width, height, pr }, resizeDispatch] = useReducer(resizer, {
    width: 0,
    height: 0,
    pr: 1,
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

  const ref = useRef(letters);

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

  useEffect(() => {
    setWords(samplesize(wordList, 15).join(" "));
  }, []);
  const that = this;

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    canvasRef.current.width = width * pr;
    canvasRef.current.height = height * pr;
    // ctx.scale(pr, pr);

    KEYS.forEach((row, i) =>
      row.forEach((letter, j) => {
        drawKey(ctx, i, j, letter, "white");
      })
    );

    return () => {
      ctx.clearRect(0, 0, width * pr, height * pr);
    };
  }, [width, height, pr]);

  const keys = useRef([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const interval = setInterval(() => {
      if (letters.length > 0) statsDispatch({ type: "TICK" });
    }, 1000);

    // const keyDown = (e: KeyboardEvent) => {
    //   // dispatch({ type: "CORRECT", key: e.key });
    // };

    let requestId: number;
    const animate = (time: number) => {
      const uniqueChars = keys.current.reverse().filter((c, index) => {
        return keys.current.findIndex((i) => i.key === c.key) === index;
      });

      const keyz = uniqueChars.map((key) => {
        const x = 255 - 1.5 * key.ttl;
        if (key.correct)
          drawKey(ctx, key.i, key.j, key.key, `rgb(${x}, 256, ${x})`);
        else drawKey(ctx, key.i, key.j, key.key, `rgb(256, ${x}, ${x})`);
        return { ...key, ttl: key.ttl - 5 };
      });
      keyz
        .filter((key) => key.ttl <= 0)
        .forEach((key) => {
          drawKey(ctx, key.i, key.j, key.key, "white");
        });

      keys.current = keyz.filter((key) => key.ttl > 0);
      requestId = window.requestAnimationFrame(animate);
    };
    requestId = window.requestAnimationFrame(animate);

    const keyUp = (e: KeyboardEvent) => {
      if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;
      const [i, j] = findKey(e.key);
      drawKey(ctx, i, j, e.key, "white");
    };

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") dispatch({ type: "BACKSPACE" });
      if (e.key === "Escape") {
        if (letters.length === 0) {
          setWords(samplesize(wordList, 15).join(" "));
        }
        dispatch({ type: "RESET" });
        statsDispatch({ type: "RESET" });
      }
      e.preventDefault();

      if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;

      if (letters.length === 0) {
        statsDispatch({ type: "START" });
      }

      const [i, j] = findKey(e.key);
      if (e.key === words[letters.length]) {
        dispatch({ type: "CORRECT", key: words[letters.length] });
        statsDispatch({ type: "CORRECT" });
        keys.current.push({ key: e.key, ttl: 128, i, j, correct: true });
      } else {
        dispatch({ type: "INCORRECT", key: words[letters.length] });
        statsDispatch({ type: "INCORRECT" });
        keys.current.push({ key: e.key, ttl: 128, i, j, correct: false });
      }

      if (letters.length === words.length - 1) {
        setWords(samplesize(wordList, 15).join(" "));
        const prevResults = JSON.parse(localStorage.getItem("results") ?? "[]");
        localStorage.setItem(
          "results",
          JSON.stringify([
            ...prevResults,
            {
              correct,
              incorrect,
              time: (time as Interval).toDuration().toISO(),
            },
          ])
        );
        dispatch({ type: "RESET" });
        statsDispatch({ type: "RESET" });
      }

      if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;

      // ctx.scale(1, 1);
      if (e.key === words[letters.length]) {
        drawKey(ctx, i, j, e.key, "green");
      } else {
        drawKey(ctx, i, j, e.key, "red");
      }
    };

    addEventListener("keydown", keyDown);
    // addEventListener("keyup", keyUp);
    // addEventListener("keydown", keyDown);
    return () => {
      // removeEventListener("keyup", keyUp);
      removeEventListener("keydown", keyDown);
      clearInterval(interval);
      window.cancelAnimationFrame(requestId);
    };
  }, [letters, words, pr]);

  const d = (time as Interval).toDuration();

  return (
    <div className="w-screen h-screen dark:text-white ">
      <div className="">
        <div className="flex gap-10 justify-center pt-10 font-mono">
          <p>Correct: {correct}</p>
          <p>Incorrect: {incorrect}</p>
          <p>Time: {d.toFormat("mm:ss")}</p>
        </div>
        <div className="hover:animate-spin absolute top-8 right-8 ">
          <FontAwesomeIcon
            icon={faGear}
            className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
            size="lg"
            // spin={}
          />
        </div>
        <div className="hover:animate-pulse absolute top-8 left-8">
          <Link href={"/stats"}>
            <FontAwesomeIcon
              icon={faChartColumn}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
            />
          </Link>
        </div>
        <p className="font-mono text-center p-10 whitespace-pre-wrap">
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
      wordList: wordBlob.split("\n"),
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
  const X = x + offset;
  const Y = y + 20;

  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.fillStyle = fillColor;
  roundRect(ctx, X, Y, width, height, 12.5, true, true);
  ctx.fillStyle = "black";
  ctx.font = `20px Roboto Mono`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(letter, X + width / 2, Y + height / 2 + 2);
  ctx.restore();
  // ctx.fillText(letter, x + width / 2, y + height);
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
  const width = 80;
  const height = 80;
  const gap = GAP;

  const keyboardLength = width * KEYS[0].length + (KEYS[0].length - 1) * gap;
  const offset = (window.innerWidth - keyboardLength) / 2 + OFFSETS[i];

  if (letter === " ") {
    makeKey(
      ctx,
      j * (width + gap),
      i * (height + gap),
      400,
      height,
      "SPACE",
      color,
      offset
    );
  } else {
    makeKey(
      ctx,
      j * (width + gap),
      i * (height + gap),
      width,
      height,
      letter.toUpperCase(),
      color,
      offset
    );
  }
};
