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

enum Category {
  Speed = "speed",
  Accuracy = "accuracy",
  Ergonomics = "ergonomics",
  Practice = "practice",
  Rhythm = "rhythm",
}

// Function to get chart data for each category
const getChartData = (category) => {
  switch (category) {
    case "speed":
      return [
        { name: "Mon", wpm: 40 },
        { name: "Tue", wpm: 45 },
        { name: "Wed", wpm: 42 },
        { name: "Thu", wpm: 48 },
        { name: "Fri", wpm: 52 },
        { name: "Sat", wpm: 55 },
        { name: "Sun", wpm: 50 },
      ];
    case "accuracy":
      return [
        { name: "Mon", accuracy: 92 },
        { name: "Tue", accuracy: 94 },
        { name: "Wed", accuracy: 91 },
        { name: "Thu", accuracy: 95 },
        { name: "Fri", accuracy: 97 },
        { name: "Sat", accuracy: 96 },
        { name: "Sun", accuracy: 98 },
      ];
    case "ergonomics":
      return [
        { name: "Mon", score: 6 },
        { name: "Tue", score: 7 },
        { name: "Wed", score: 8 },
        { name: "Thu", score: 7 },
        { name: "Fri", score: 9 },
        { name: "Sat", score: 8 },
        { name: "Sun", score: 9 },
      ];
    case "practice":
      return [
        { name: "Mon", minutes: 15 },
        { name: "Tue", minutes: 20 },
        { name: "Wed", minutes: 25 },
        { name: "Thu", minutes: 15 },
        { name: "Fri", minutes: 30 },
        { name: "Sat", minutes: 35 },
        { name: "Sun", minutes: 25 },
      ];
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

// This would typically come from your AI backend
const getSuggestions = () => ({
  speed: [
    "Practice common word combinations to increase your typing speed.",
    "Use all your fingers and avoid looking at the keyboard while typing.",
    "Set small, achievable goals and gradually increase your target WPM.",
  ],
  accuracy: [
    "Focus on accuracy over speed initially. Speed will come with practice.",
    "Take your time to hit the correct keys, even if it means typing slower at first.",
    "Pay attention to problematic keys or words and practice them specifically.",
  ],
  ergonomics: [
    "Maintain good posture while typing to prevent fatigue and potential injuries.",
    "Position your keyboard at elbow height to reduce strain on your wrists.",
    "Take regular breaks to rest your eyes and stretch your fingers and wrists.",
  ],
  practice: [
    "Dedicate at least 15-30 minutes daily to typing practice.",
    "Use varied texts for practice, including articles, books, and typing games.",
    "Challenge yourself with timed typing tests to track your progress.",
  ],
  rhythm: [
    "Practice typing to the beat of music to develop a steady rhythm.",
    "Use a metronome app to maintain a consistent typing pace.",
    "Focus on smooth, fluid motions rather than individual keystrokes.",
  ],
});

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
      <h4 className="sr-only">Status</h4>
      <p className="text-sm font-medium text-gray-900">
        Migrating MySQL database...
      </p>
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

export default function AIAssistant() {
  const [suggestions, setSuggestions] = useState(getSuggestions());
  const [challengeTime, setChallengeTime] = useState(120); // 2 minutes in seconds
  const [isChallengeActive, setIsChallengeActive] = useState(false);

  const refreshSuggestions = () => {
    setSuggestions(getSuggestions());
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

  return (
    <div className="container mx-auto p-4 max-w-4xl text-black">
      <Card
        header={
          <div className="flex flex-row items-center justify-between">
            <h1 className="text-2xl font-bold">AI Typing Assistant</h1>
            <Button onClick={refreshSuggestions}>
              <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <p className="text-muted-foreground">
          Here are some AI-generated suggestions to help improve your typing
          skills. Click the refresh button for new tips!
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
                        <YAxis />
                        <Tooltip />
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
                  {(() => {
                    const { current, goal, unit } = getGoalData(category);
                    const progress = (current / goal) * 100;
                    return (
                      <>
                        <div className="flex justify-between mb-2">
                          <span>
                            Current: {current} {unit}
                          </span>
                          <span>
                            Goal: {goal} {unit}
                          </span>
                        </div>
                        <Progress value={progress} />
                      </>
                    );
                  })()}
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
