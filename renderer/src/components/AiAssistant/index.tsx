"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faBoltLightning,
  faBullseye,
  faCoffee,
  faKeyboard,
  faMusicNote,
  faPlay,
} from "@fortawesome/pro-duotone-svg-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Result, useResults } from "@/lib/result-provider";
import { Duration } from "luxon";
import { useQuery } from "@apollo/client";
import { GET_AI_DATA } from "@/transactions/getAI";
import { Goal } from "@/generated/graphql";
import Confetti from "react-confetti";
import { useIntersectionObserver, useWindowSize } from "@uidotdev/usehooks";

enum Category {
  Speed = "speed",
  Accuracy = "accuracy",
  Ergonomics = "ergonomics",
  Practice = "practice",
  Rhythm = "rhythm",
}

// Function to get chart data for each category
const getChartData = (category) => {
  const { results } = useResults();

  // results is an array of each typing test result
  // bucket these results into dates and calculate the average for each day

  const resultsByDate = results.reduce((acc, result) => {
    const date = new Date(result.datetime).toLocaleDateString();

    if (acc.has(date)) {
      const sameDate = acc.get(date)!;
      sameDate.push(result);
      const sorted = sameDate.sort(
        (a, b) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      );
      acc.set(date, [...sorted]);
    } else {
      acc.set(date, [result]);
    }

    return acc;
  }, new Map<string, Result[]>());

  console.log("RESULTS SORTED", resultsByDate);

  switch (category) {
    case "speed": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const wpm = res
            ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
            : 0;
          return { name: intlFormat.format(date), wpm: wpm.toFixed(0) };
        });

      // const data = Object.entries(resultsByDate).map(([date, res]) => {
      //     const wpm = res.reduce((acc, r) => acc + r.cpm, 0) / results.length;
      //     return { name: date, wpm };
      // });
      return data.reverse();
    }
    case "accuracy": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce((acc, r) => acc + r.correct + r.incorrect, 0) ?? 0;
          const correct = res?.reduce((acc, r) => acc + r.correct, 0) ?? 0;
          return {
            name: intlFormat.format(date),
            accuracy: ((correct / total) * 100).toFixed(0),
          };
        });

      return data.reverse();
    }
    case "ergonomics": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce((acc, r) => acc + r.correct + r.incorrect, 0) ?? 0;
          const correct = res?.reduce((acc, r) => acc + r.correct, 0) ?? 0;
          const accuracy = (correct / total) * 100;
          const wpm = res
            ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
            : 0;
          const duration = res
            ? res.reduce(
                (acc, r) => acc.plus(Duration.fromISO(r.time)),
                Duration.fromMillis(0),
              )
            : Duration.fromMillis(0);
          // break frequency is the gap between each test summed together
          const breakFrequency = res
            ? res.reduce((acc, r, i) => {
                if (i === 0) return acc;
                const previous = new Date(res[i - 1].datetime);
                const current = new Date(r.datetime);
                return (
                  acc +
                  (current.getTime() -
                    previous.getTime() +
                    Duration.fromISO(r.time).milliseconds)
                );
              }, 0)
            : 0;

          return {
            name: intlFormat.format(date),
            score: (
              0.3 * wpm +
              0.3 * accuracy -
              0.2 * duration.as("minutes") +
              0.2 * breakFrequency +
              0.3 * 10
            ).toFixed(0),
          };
        });

      return data.reverse();
    }
    case "practice": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce(
              (acc, r) => acc.plus(Duration.fromISO(r.time)),
              Duration.fromMillis(0),
            ) ?? Duration.fromMillis(0);
          return {
            name: intlFormat.format(date),
            minutes: total.as("minutes"),
            label: total.rescale().toHuman(),
          };
        });

      return data.reverse();
    }
    case "rhythm":
      return [
        { name: "Mon", consistency: 65 },
        { name: "Tue", consistency: 70 },
        { name: "Wed", consistency: 68 },
        { name: "Thu", consistency: 75 },
        { name: "Fri", consistency: 78 },
        { name: "Sat", consistency: 80 },
        { name: "Sun", consistency: 82 },
      ];
  }
};

const getGoalData = (category) => {
  switch (category) {
    case "speed":
      return { current: 50, goal: 80, unit: "WPM" };
    case "accuracy":
      return { current: 92, goal: 98, unit: "%" };
    case "ergonomics":
      return { current: 7, goal: 10, unit: "Score" };
    case "practice":
      return { current: 20, goal: 30, unit: "min/day" };
    case "rhythm":
      return { current: 75, goal: 90, unit: "Consistency" };
    default:
      return { current: 0, goal: 0, unit: "" };
  }
};

const getDailyChallenge = (category) => {
  switch (category) {
    case "speed":
      return "Type 100 words in 2 minutes";
    case "accuracy":
      return "Type a paragraph with 99% accuracy";
    case "ergonomics":
      return "Complete a 5-minute typing session with perfect posture";
    case "practice":
      return "Practice for 30 minutes today";
    case "rhythm":
      return "Maintain a consistent 60 WPM for 3 minutes";
    default:
      return "No challenge available";
  }
};

function Card({ header, children }) {
  return (
    <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:px-6">{header}</div>
      <div className="px-4 py-5 sm:p-6">{children}</div>
    </div>
  );
}

const tabs = [
  {
    label: "Speed",
    value: "speed",
    icon: faBoltLightning,
  },
  {
    label: "Accuracy",
    value: "accuracy",
    icon: faBullseye,
  },
  {
    label: "Ergonomics",
    value: "ergonomics",
    icon: faCoffee,
  },
  {
    label: "Practice",
    value: "practice",
    icon: faKeyboard,
  },
  {
    label: "Rhythm",
    value: "rhythm",
    icon: faMusicNote,
  },
];

function Progress({ value }) {
  return (
    <div>
      <div aria-hidden="true" className="mt-6">
        <div className="overflow-hidden rounded-full bg-gray-200">
          <div
            style={{ width: `${value}%` }}
            className="h-2 rounded-full bg-indigo-600"
          />
        </div>
      </div>
    </div>
  );
}

function makeGoal(
  goal: Goal,
  results: Result[],
): {
  current: string;
  goal: string;
  unit: string;
  description: string;
  progress: number;
} {
  const isTime = !!goal.requirement.time;
  const isCorrect = !!goal.requirement.correct;
  const isIncorrect = !!goal.requirement.incorrect;
  const isCapital = !!goal.requirement.capital;
  const isPunctuation = !!goal.requirement.punctuation;
  const isNumbers = !!goal.requirement.numbers;
  const isCpm = !!goal.requirement.cpm;

  let progress = 0;
  let target = 0;
  let unit = "";
  let current = 0;
  if (isCpm) {
    // in results find the highest cpm
    const highestCpm = results.reduce((acc, r) => Math.max(acc, r.cpm), 0);
    progress = (highestCpm / goal.requirement.cpm!) * 100;
    target = goal.requirement.cpm!;
    unit = "CPM";
    current = highestCpm;
  }

  // const progress = (current / target) * 100;

  return {
    current: current.toFixed(0),
    goal: target.toFixed(0),
    unit,
    description: goal.description,
    progress,
  };
}

export default function AIAssistant() {
  // const [suggestions, setSuggestions] = useState(getSuggestions());
  const { width, height } = useWindowSize();
  const [challengeTime, setChallengeTime] = useState(120); // 2 minutes in seconds
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [confetti, setConfetti] = useState(true);

  const { results } = useResults();

  // const refreshSuggestions = () => {
  //   setSuggestions(getSuggestions());
  // };
  const { data, loading, error, refetch } = useQuery<{
    speedRecommendation: string[];
    accuracyRecommendation: string[];
    ergonomicsRecommendation: string[];
    practiceRecommendation: string[];
    rhythmRecommendation: string[];

    speedGoal: Goal;
    accuracyGoal: Goal;
    ergonomicsGoal: Goal;
    practiceGoal: Goal;
    rhythmGoal: Goal;
  }>(GET_AI_DATA);
  const suggestions = {
    speed: data?.speedRecommendation ?? [],
    accuracy: data?.accuracyRecommendation ?? [],
    ergonomics: data?.ergonomicsRecommendation ?? [],
    practice: data?.practiceRecommendation ?? [],
    rhythm: data?.rhythmRecommendation ?? [],
  };

  const goals = {
    speed: data?.speedGoal ?? { current: 0, goal: 0 },
    accuracy: data?.accuracyGoal ?? { current: 0, goal: 0 },
    ergonomics: data?.ergonomicsGoal ?? { current: 0, goal: 0 },
    practice: data?.practiceGoal ?? { current: 0, goal: 0 },
    rhythm: data?.rhythmGoal ?? { current: 0, goal: 0 },
  };

  const startChallenge = () => {
    setIsChallengeActive(true);
    setChallengeTime(120);
  };

  useEffect(() => {
    let timer;
    if (isChallengeActive && challengeTime > 0) {
      timer = setTimeout(() => setChallengeTime(challengeTime - 1), 1000);
    } else if (challengeTime === 0) {
      setIsChallengeActive(false);
    }
    return () => clearTimeout(timer);
  }, [isChallengeActive, challengeTime]);

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl text-black">
      <Card
        header={
          <div className="flex flex-row items-center justify-between">
            <h1 className="text-2xl font-bold">Advanced Inference</h1>
            <Button onClick={refetch}>
              <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <p className="text-muted-foreground">
          Using advanced AI models to provide personalized typing tips to deepen
          your understanding of how you type to improve your skills. Get started
          by selecting a category below to view tips and set goals.
        </p>
      </Card>

      <TabGroup defaultValue="speed">
        <TabList className="flex gap-4 mx-auto my-4">
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              className="rounded-full py-1 px-3 text-sm/6 font-semibold text-white focus:outline-none data-[selected]:bg-white/10 data-[hover]:bg-white/5 data-[selected]:data-[hover]:bg-white/10 data-[focus]:outline-1 data-[focus]:outline-white"
              value={tab.value}
            >
              {tab.label}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {Object.entries(suggestions).map(([category, tips]) => {
            const tab = tabs.find((tab) => tab.value === category)!;
            const { description, progress, goal, unit, current } = makeGoal(
              goals[category],
              results,
            );
            return (
              <TabPanel key={category} className="flex flex-col gap-6">
                <Card
                  header={
                    <div>
                      <h1 className="flex items-center">
                        <FontAwesomeIcon
                          icon={tab.icon}
                          className="mr-2 h-4 w-4"
                        />
                        {tab.label} Tips
                      </h1>
                    </div>
                  }
                >
                  <div className="mb-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData(category)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis
                          tickFormatter={(tick) => {
                            if (category === "speed") {
                              return `${tick}`;
                            } else if (category === "accuracy") {
                              return `${tick}%`;
                            } else if (category === "ergonomics") {
                              return `${tick}`;
                            } else if (category === "practice") {
                              return `${tick} min`;
                            } else if (category === "rhythm") {
                              return `${tick}%`;
                            }
                            return tick;
                          }}
                        />
                        <Tooltip
                          formatter={(value, name, props) => {
                            if (category === "speed") {
                              return `${value} WPM`;
                            } else if (category === "accuracy") {
                              return `${value}%`;
                            } else if (category === "ergonomics") {
                              return `${value} Score`;
                            } else if (category === "practice") {
                              return `${props.payload.label}`;
                            } else if (category === "rhythm") {
                              return `${value}%`;
                            }
                            return value;
                          }}
                        />
                        <Bar
                          dataKey={
                            category === "speed"
                              ? "wpm"
                              : category === "accuracy"
                                ? "accuracy"
                                : category === "ergonomics"
                                  ? "score"
                                  : category === "rhythm"
                                    ? "consistency"
                                    : "minutes"
                          }
                          fill="#8884d8"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="list-disc pl-5 space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </Card>

                <Card header={<div>Your Goal</div>}>
                  <>
                    <div
                      className="flex justify-between mb-2 flex-col"
                      ref={ref}
                    >
                      <p className="text-sm">{description}</p>
                      <span>
                        Current: {current} {unit}
                      </span>
                      <span>
                        Goal: {goal} {unit}
                      </span>
                      <button
                        onClick={() => {
                          console.log("END");
                          setConfetti(false);
                        }}
                      >
                        End Confetti
                      </button>
                    </div>
                    <div className="fixed top-0 left-0">
                      {confetti && entry?.isIntersecting && (
                        <Confetti
                          tweenDuration={7000}
                          numberOfPieces={500}
                          recycle={false}
                          width={width}
                          height={height}
                        />
                      )}
                    </div>

                    <Progress value={progress} />
                  </>
                </Card>

                <Card header={<div>Daily Challengers</div>}>
                  <p className="mb-4">{getDailyChallenge(category)}</p>
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={startChallenge}
                      disabled={isChallengeActive}
                    >
                      <FontAwesomeIcon icon={faPlay} className="mr-2" />
                      Start Challenge
                    </Button>
                    <div className="text-2xl font-bold">
                      {Math.floor(challengeTime / 60)}:
                      {(challengeTime % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                </Card>
              </TabPanel>
            );
          })}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
