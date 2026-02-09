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
} from "@fortawesome/pro-duotone-svg-icons";
import { Card } from "./Card";
import { GoalCard } from "./GoalCard";
import { ChallengeCard } from "./ChallengeCard";
import { DataCard } from "./DataCard";
import { WeeklyProgressSummary } from "./WeeklyProgressSummary";
import { Category } from "./utils";
import type { ChartDataDays } from "./getChartData";

const tabs = [
  {
    label: "Speed",
    value: Category.Speed,
    icon: faBoltLightning,
  },
  {
    label: "Accuracy",
    value: Category.Accuracy,
    icon: faBullseye,
  },
  {
    label: "Ergonomics",
    value: Category.Ergonomics,
    icon: faCoffee,
  },
  {
    label: "Practice",
    value: Category.Practice,
    icon: faKeyboard,
  },
  {
    label: "Rhythm",
    value: Category.Rhythm,
    icon: faMusicNote,
  },
];

export default function AIAssistant() {
  const [chartDays, setChartDays] = useState<ChartDataDays>(7);
  const [challengeTime, setChallengeTime] = useState(120); // 2 minutes in seconds
  const [isChallengeActive, setIsChallengeActive] = useState(false);

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
            <h1 className="text-2xl font-bold">Advanced Inference</h1>
            <Button>
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

      <div className="my-6">
        <WeeklyProgressSummary />
      </div>

      <div className="flex items-center justify-end gap-2 my-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Chart range:</span>
        <button
          type="button"
          onClick={() => setChartDays(7)}
          className={`rounded-full py-1 px-3 text-sm font-medium ${
            chartDays === 7
              ? "bg-white/20 text-white"
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          Last 7 days
        </button>
        <button
          type="button"
          onClick={() => setChartDays(30)}
          className={`rounded-full py-1 px-3 text-sm font-medium ${
            chartDays === 30
              ? "bg-white/20 text-white"
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          Last 30 days
        </button>
      </div>

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
          {tabs.map((tab) => (
            <TabPanel key={tab.value} className="flex flex-col gap-6">
              <DataCard
                category={tab.value}
                icon={tab.icon}
                label={tab.label}
                days={chartDays}
              />
              <GoalCard category={tab.value} />
              {/* <ChallengeCard
                category={tab.value}
                startChallenge={() => {}}
                isChallengeActive={true}
                challengeTime={0}
              /> */}
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
