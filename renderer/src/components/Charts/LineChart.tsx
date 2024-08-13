"use client";

import { KeyboardLayoutNames } from "@/keyboards";
import { useResults } from "@/lib/result-provider";
import {
  axisBottom,
  axisLeft,
  axisRight,
  extent,
  line,
  max,
  scaleLinear,
  scaleTime,
  select,
} from "d3";
import { Duration } from "luxon";
import { useEffect, useRef, useState } from "react";

interface Result {
  correct: number;
  incorrect: number;
  cpm: number;
  level: number;
  keyboard: string;
  language: string;
  datetime: Date;
  time: Duration;
}

const margin = { top: 10, right: 30, bottom: 30, left: 60 };
// const   width = 460 - margin.left - margin.right,
// height = 400 - margin.top - margin.bottom;

interface LineChartProps {
  keyboard: KeyboardLayoutNames;
}

export default function LineChart({keyboard}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {results} = useResults()
  const [computedResults, setComputedResults] = useState<Result[]>([]);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const resize = () => {
      setSize({
        width: window.innerWidth * 0.8,
        height: window.innerHeight * 0.5,
      });
    };
    window.addEventListener("resize", resize);
    resize();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const computed = results
      .filter(result => result.keyboard === keyboard)

    const minMax = extent(results, function (d) {
      return new Date(d.datetime);
    });
    if (minMax[0] === undefined || minMax[1] === undefined) return;
    const x = scaleTime().domain(minMax).range([0, width]);

    const svg = select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(axisBottom(x));

    // Add Y axis
    const maxTime = max(computed, function (d) {
      return Duration.fromISO(d.time).toMillis() / 1000
    });
    if (maxTime === undefined) return;
    const y = scaleLinear().domain([0, maxTime]).range([height, 0]);
    svg.append("g").call(axisLeft(y));

    const maxIncorrect = max(computed, function (d) {
      return +d.incorrect;
    });
    if (maxIncorrect === undefined) return;
    const y2 = scaleLinear()
      .domain([0, maxIncorrect * 1.7])
      .range([height, 0]);
    svg
      .append("g")
      .call(axisRight(y2))
      .attr("transform", `translate(${width}, 0)`);

    // Add the line
    svg
      .append("path")
      .datum(computed)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3.5)
      .attr(
        "d",
        line(
          (d) => x(new Date(d.datetime)),
          (d) => y(Duration.fromISO(d.time).toMillis() / 1000),
        ),
      );

    svg
      .append("path")
      .datum(computed)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 3.5)
      .attr(
        "d",
        line(
          (d ) => x(new Date(d.datetime)),
          (d ) => y2(d.incorrect),
        ),
      );
  }, [results, width, height]);

  return <svg ref={svgRef} className="mx-auto" />;
}
