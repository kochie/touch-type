import { useEffect, useReducer, useRef, useState } from "react";
import { DateTime, Interval } from "luxon";
import samplesize from "lodash.samplesize";
// @ts-ignore
import wordBlob from "../assets/words.txt";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartColumn,
  faGear,
  faRunning,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Canvas from "../components/canvas";
import { drawKey, findKey, KEYS } from "../lib/canvas_utils";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
} from "@fortawesome/pro-duotone-svg-icons";

interface IndexProps {
  wordList: string[];
}

const statsReducer = (state, action) => {
  switch (action.type) {
    case "CORRECT":
      return {
        ...state,
        correct: state.correct + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters, { key: action.key, correct: true }],
      };
    case "INCORRECT":
      return {
        ...state,
        incorrect: state.incorrect + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters, { key: action.key, correct: false }],
      };
    case "BACKSPACE":
      return {
        ...state,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters.slice(0, -1)],
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
        letters: [],
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
  const [words, setWords] = useState("");

  const [{ correct, incorrect, time, letters }, statsDispatch] = useReducer(
    statsReducer,
    {
      correct: 0,
      incorrect: 0,
      time: Interval.after(DateTime.now(), 0),
      start: DateTime.now(),
      letters: [],
    }
  );

  useEffect(() => {
    setWords(samplesize(wordList, 15).join(" "));
  }, [wordList]);

  const keys = useRef([]);

  const d = (time as Interval).toDuration();
  const total = correct + incorrect;
  const m = d.toMillis() / 1000 / 60;
  const cpm = total / m;
  const p = (correct / total) * 100;

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (e.key === "Backspace") statsDispatch({ type: "BACKSPACE" });
    if (e.key === "Escape") {
      if (letters.length === 0) {
        setWords(samplesize(wordList, 15).join(" "));
      }
      // dispatch({ type: "RESET" });
      statsDispatch({ type: "RESET" });
    }
    e.preventDefault();

    // console.log(e.key);
    if (
      !KEYS.some((rows) => {
        return rows.some((key) =>
          typeof key === "object"
            ? key.key === e.key.toUpperCase()
            : key === e.key.toUpperCase()
        );
      })
    )
      return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
    }

    const [i, j] = findKey(e.key);

    if (e.key === words[letters.length]) {
      // dispatch({ type: "CORRECT", key: words[letters.length] });
      statsDispatch({ type: "CORRECT", key: words[letters.length] });
      keys.current.push({ key: e.key, ttl: 255, i, j, correct: true });
    } else {
      // dispatch({ type: "INCORRECT", key: words[letters.length] });
      statsDispatch({ type: "INCORRECT", key: words[letters.length] });
      keys.current.push({ key: e.key, ttl: 255, i, j, correct: false });
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
      // dispatch({ type: "RESET" });
      statsDispatch({ type: "RESET" });
    }

    if (!KEYS.some((rows) => rows.includes(e.key.toUpperCase()))) return;

    // ctx.scale(1, 1);
    if (e.key === words[letters.length]) {
      drawKey(ctx, i, j, e.key, "rgba(0, 255, 0, 0.5)");
    } else {
      drawKey(ctx, i, j, e.key, "rgba(255, 0, 0, 0.5)");
    }
  };

  const intervalFn = () => {
    if (letters.length > 0) statsDispatch({ type: "TICK" });
  };

  return (
    <div className="w-screen h-screen dark:text-white ">
      <div className="">
        <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
          {/* <p>Correct: {correct}</p> */}
          <div className="flex items-center">
            <FontAwesomeIcon icon={faDungeon} size="3x" />
            <div className="ml-5">
              <p className="text-4xl">{incorrect}</p>
              <p className="text-sm text-gray-400">typos</p>
            </div>
          </div>
          {/* <p>Time: {d.toFormat("mm:ss")}</p> */}
          <div className="flex items-center">
            <FontAwesomeIcon icon={faPersonRunning} size="3x" />
            <div className="ml-5">
              <p className="text-4xl">
                {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
              </p>
              <p className="text-sm text-gray-400">char/min</p>
            </div>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faPercentage} size="3x" />
            <div className="ml-5">
              <p className="text-4xl">
                {Number.isFinite(p) ? p.toFixed(0) : 0}
              </p>
              <p className="text-sm text-gray-400">accuracy</p>
            </div>
          </div>
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
        <p className="font-['Roboto_Mono'] text-center p-10 whitespace-pre-wrap">
          {letters.map((letter, i) => (
            // <span
            //   key={i}
            //   className={letter.correct ? "bg-green-300" : "bg-red-500"}
            // >
            //   {letter.key}
            // </span>
            <span
              key={i}
              className={letter.correct ? "text-gray-400" : "bg-red-500"}
            >
              {letter.key}
            </span>
          ))}
          <span className="bg-yellow-600 font-bold text-gray-200">
            {words[letters.length]}
          </span>
          {words.substring(letters.length + 1, words.length)}
        </p>

        <Canvas
          letters={letters}
          keyDown={keyDown}
          keys={keys}
          intervalFn={intervalFn}
        />
      </div>
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
