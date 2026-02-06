"use client";

import { Result, useResults } from "@/lib/result-provider";
import { useIntersectionObserver, useWindowSize } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { Card } from "./Card";
import Confetti from "react-confetti";
import { Category } from "./utils";
import { Skeleton } from "../Skeleton";
import Button from "../Button";
import { getGoal, newGoal } from "@/transactions/getGoal";
import { Tables } from "@/types/supabase";

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

function makeGoalDisplay(
  goal: Tables<"goals">,
  results: Result[],
): {
  current: string;
  goal: string;
  unit: string;
  description: string;
  progress: number;
} {
  const requirement = goal.requirement as Tables<"goals">["requirement"] as {
    cpm?: number;
  };
  const isCpm = !!requirement?.cpm;

  let progress = 0;
  let target = 0;
  let unit = "";
  let current = 0;
  
  if (isCpm) {
    // in results find the highest cpm
    const highestCpm = results.reduce((acc, r) => Math.max(acc, r.cpm), 0);
    progress = (highestCpm / requirement.cpm!) * 100;
    target = requirement.cpm!;
    unit = "CPM";
    current = highestCpm;
  }

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
  const [goal, setGoalData] = useState<Tables<"goals"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [confetti, setConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  const [displayData, setDisplayData] = useState({
    description: "",
    progress: 0,
    goal: "",
    unit: "",
    current: "",
  });

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        setLoading(true);
        const data = await getGoal(category);
        setGoalData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGoal();
  }, [category]);

  useEffect(() => {
    if (goal) {
      const g = makeGoalDisplay(goal, results);
      setDisplayData(g);
      if (g.progress >= 100) {
        setConfetti(true);
      }
    }
  }, [goal, results]);

  const handleResetGoal = async () => {
    try {
      setResetting(true);
      const newGoalData = await newGoal(category);
      setGoalData(newGoalData);
      setConfetti(false);
    } catch (err: any) {
      console.error('Error resetting goal:', err);
    } finally {
      setResetting(false);
    }
  };

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
          {displayData.description ? (
            <p className="text-base">{displayData.description}</p>
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
              {Math.min(displayData.progress, 100).toFixed(0)}%
            </div>
          </div>
          <Progress value={displayData.progress} />
          <div className="flex w-full gap-10 mt-1 items-baseline justify-between">
            <div>
              <p className="font-bold text-2xl">
                {displayData.current} {displayData.unit.toLowerCase()}
              </p>
              <p className="text-sm text-black/55 font-semibold">Current</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-2xl">
                {displayData.goal} {displayData.unit}
              </p>
              <p className="text-sm text-black/55 font-semibold">Target</p>
            </div>
          </div>
          {displayData.progress >= 100 && (
            <div className="flex justify-between items-center mt-5">
              <div>Great job! You've achieved this goal! 🎉🎉</div>
              <div>
                <Button onClick={handleResetGoal} disabled={resetting}>
                  {resetting ? 'Loading...' : 'New Goal'}
                </Button>
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
              width={width ?? 0}
              height={height ?? 0}
            />
          )}
        </div>
      </>
    </Card>
  );
}
