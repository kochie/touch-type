import { useEffect, useReducer, useRef, useState } from "react";
import { DateTime, Interval } from "luxon";
import samplesize from "lodash.samplesize";
// @ts-ignore
import wordBlob from "../assets/words.txt";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faGear } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Canvas from "../components/Canvas";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
} from "@fortawesome/pro-duotone-svg-icons";
import { Keyboard } from "../lib/keyboard_layouts";
import { useSettings } from "../lib/settings_hook";
import { LEVEL_1 } from "../lib/levels";

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
      // console.log(state.letters);
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
  const settings = useSettings();

  useEffect(() => {
    const filtered = wordList.filter((word) => word.match(settings.level));
    // console.log(filtered);
    setWords(samplesize(filtered, 15).join(" "));
  }, [wordList, settings.level]);

  const keys = useRef([]);

  const d = (time as Interval).toDuration();
  const total = correct + incorrect;
  const m = d.toMillis() / 1000 / 60;
  const cpm = total / m;
  const p = (correct / total) * 100;

  const keyboard = new Keyboard(settings.keyboard);

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") {
      if (letters.length === 0) {
        const filtered = wordList.filter((word) => word.match(settings.level));
        // console.log(LEVEL_1);
        setWords(samplesize(filtered, 15).join(" "));
      }
      statsDispatch({ type: "RESET" });
      return;
    }
    e.preventDefault();

    if (!keyboard.keyExists(e.key)) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
    }

    const key = keyboard.findKey(e.key);
    const [i, j] = keyboard.findIndex(e.key);

    if (key.isInert) return;

    if (e.key === words[letters.length]) {
      // dispatch({ type: "CORRECT", key: words[letters.length] });
      statsDispatch({ type: "CORRECT", key: words[letters.length] });
      keys.current.push({ key: key, ttl: 255, i, j, correct: true });
    } else {
      // dispatch({ type: "INCORRECT", key: words[letters.length] });
      statsDispatch({ type: "INCORRECT", key: words[letters.length] });
      keys.current.push({ key: key, ttl: 255, i, j, correct: false });
    }

    if (letters.length === words.length - 1) {
      const filtered = wordList.filter((word) => word.match(settings.level));
      setWords(samplesize(filtered, 15).join(" ").replace("  ", ""));
      const prevResults = JSON.parse(localStorage.getItem("results") ?? "[]");
      localStorage.setItem(
        "results",
        JSON.stringify([
          ...prevResults,
          {
            correct,
            incorrect,
            time: (time as Interval).toDuration().toISO(),
            level: settings.levelName,
            keyboard: settings.keyboardName,
          },
        ])
      );
      // dispatch({ type: "RESET" });
      statsDispatch({ type: "RESET" });
    }

    // if (!KEYS.keyExists(e.key)) return;

    // ctx.scale(1, 1);
    // const key = KEYS.findKey(e.key)
    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
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
          <Link href={"/settings"}>
            <FontAwesomeIcon
              icon={faGear}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
              // spin={}
            />
          </Link>
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
      wordList: wordBlob.replaceAll("\r", "").split("\n"),
    }, // will be passed to the page component as props
  };
}

export default IndexPage;
