"use client";

import {
  axisBottom,
  axisLeft,
  extent,
  line,
  max,
  scaleLinear,
  scaleTime,
  select,
  timeParse,
} from "d3";
import { DateTime, Duration } from "luxon";
import { useEffect, useRef, useState } from "react";

interface Result {
  correct: number;
  incorrect: number;
  cpm: number;
  level: number;
  keyboard: string;
  language: string;
  datetime: Date;
}

const margin = { top: 10, right: 30, bottom: 30, left: 60 },
  width = 460 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;

export default function LineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [results, setResults] = useState<Result[]>([]);
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

    const storedResults = JSON.parse(localStorage.getItem("results") ?? "[]");
    const computed = storedResults
      .filter((res) => !!res.datetime)
      .map((res) => ({
        ...res,
        cpm:
          (res.correct + res.incorrect) /
          (Duration.fromISO(res.time).toMillis() / 1000 / 60),
        datetime: DateTime.fromMillis(res.datetime ?? 0).toJSDate(),
      }));
    console.log(computed);
    setResults(computed);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const minMax = extent(results, function (d) {
      return d.datetime;
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
    const maxCpm = max(results, function (d) {
      return +d.cpm;
    });
    if (maxCpm === undefined) return;
    const y = scaleLinear().domain([0, maxCpm]).range([height, 0]);
    svg.append("g").call(axisLeft(y));

    // Add the line
    svg
      .append("path")
      .datum(results)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3.5)
      .attr(
        "d",
        line()
          .x(function (d: Result) {
            return x(d.datetime);
          })
          .y(function (d: Result) {
            return y(d.cpm);
          })
      );
  }, [results]);

  return <svg ref={svgRef} className="mx-auto" />;
}
