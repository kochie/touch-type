"use client";

import { Goal } from "@/generated/graphql";
import { Result, useResults } from "@/lib/result-provider";
import { GET_GOAL } from "@/transactions/getGoal";
import { useQuery } from "@apollo/client";
import { useIntersectionObserver, useWindowSize } from "@uidotdev/usehooks";
import { useState } from "react";
import { Card } from "./Card";
import Confetti from "react-confetti";
import { Category } from "./utils";

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

export function GoalCard({ category }: { category: Category }) {
  const { results } = useResults();
  const { data, loading, error } = useQuery<{ goal: Goal }>(GET_GOAL, {
    variables: { category },
  });

  const [confetti, setConfetti] = useState(true);
  const { width, height } = useWindowSize();
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  if (!data || loading) {
    return <div>Loading...</div>;
  }

  const { description, progress, goal, unit, current } = makeGoal(
    data.goal,
    results,
  );

  return (
    <Card header={<div>Your Goal for {category}</div>}>
      <>
        <div className="flex justify-between mb-2 flex-col" ref={ref}>
          <p className="text-sm">{description}</p>
          <div className="flex w-full justify-between">
            <span>
              Current: {current} {unit}
            </span>
            <span>
              Goal: {goal} {unit}
            </span>
          </div>
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
  );
}
