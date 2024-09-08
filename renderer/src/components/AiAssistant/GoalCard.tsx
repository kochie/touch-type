"use client";

import { Goal } from "@/generated/graphql";
import { Result, useResults } from "@/lib/result-provider";
import { GET_GOAL } from "@/transactions/getGoal";
import { useMutation, useQuery } from "@apollo/client";
import { useIntersectionObserver, useWindowSize } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { Card } from "./Card";
import Confetti from "react-confetti";
import { Category } from "./utils";
import { Skeleton } from "../Skeleton";
import Button from "../Button";
import { RESET_GOAL } from "@/transactions/resetGoal";

function Progress({ value }) {
  return (
    <div>
      <div aria-hidden="true" className="mt-1">
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

export function GoalCard({ category }: { category: Category }) {
  const { results } = useResults();
  const { data, loading, error } = useQuery<{ goal: Goal }>(GET_GOAL, {
    variables: { category },
  });

  const [resetGoal, {data: goalChange}] = useMutation<{newGoal: Goal}>(RESET_GOAL);

  const [confetti, setConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  const [{ description, progress, goal, unit, current }, setGoal] = useState({
    description: "",
    progress: 0,
    goal: "",
    unit: "",
    current: "",
  });

  useEffect(() => {
    if (data) {
      const g = makeGoal(data.goal, results);
      setGoal(g);
    }
    if (goalChange) {
      const g = makeGoal(goalChange.newGoal, results);
      setGoal(g);
    }
    if (progress >= 100) {
      setConfetti(true);
    }
  }, [data, goalChange, results]);

  return (
    <Card
      header={
        <div>
          Your Goal for {category[0].toUpperCase()}
          {category.slice(1)}
        </div>
      }
    >
      <>
        <div className="flex justify-between mb-2 flex-col" ref={ref}>
          {description ? (
            <p className="text-base">{description}</p>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-[500px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
          )}

          <div className="flex justify-between items-center mt-5">
            <div className="font-semibold">Progress</div>
            <div className="font-semibold">
              {Math.min(progress, 100).toFixed(0)}%
            </div>
          </div>
          <Progress value={progress} />
          <div className="flex w-full gap-10 mt-1 items-baseline justify-between">
            <div>
              <p className="font-bold text-2xl">
                {current} {unit.toLowerCase()}
              </p>
              <p className="text-sm text-black/55 font-semibold">Current</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-2xl">
                {goal} {unit}
              </p>
              <p className="text-sm text-black/55 font-semibold">Target</p>
            </div>
          </div>
          {progress >= 100 && (
            <div className="flex justify-between items-center mt-5">
              <div>Great job! You've achieved this goal! 🎉🎉</div>
              <div>
                <Button onClick={() => resetGoal({variables: {category}})}>New Goal</Button>
              </div>
            </div>
          )}
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
      </>
    </Card>
  );
}
