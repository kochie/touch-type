"use client";

import type { Result } from "@/lib/result-provider";
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

const margin = { top: 10, right: 30, bottom: 30, left: 60 };

interface LineChartProps {
  keyboard: KeyboardLayoutNames;
}

export default function LineChart({ keyboard }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { results } = useResults();
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });

  const computedResults = results
    .filter((r) => r.keyboard === keyboard)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  useEffect(() => {
    const resize = () => {
      setSize({
        width: window.innerWidth * 0.8,
        height: window.innerHeight * 0.5,
      });
    };
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const minMax = extent(computedResults, (d) => new Date(d.datetime));
    if (minMax[0] == null || minMax[1] == null) return;

    const x = scaleTime().domain(minMax).range([0, width]);
    const maxTime = max(computedResults, (d) =>
      Duration.fromISO(d.time).toMillis() / 1000
    );
    const maxIncorrect = max(computedResults, (d) => Number(d.incorrect));
    if (maxTime == null || maxIncorrect == null) return;

    const y = scaleLinear().domain([0, maxTime]).range([height, 0]);
    const y2 = scaleLinear()
      .domain([0, maxIncorrect * 1.7])
      .range([height, 0]);

    const svg = select(svgRef.current);
    svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(axisBottom(x));

    g.append("g").call(axisLeft(y));

    g.append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(axisRight(y2));

    const timeLine = line<Result>()
      .x((d) => x(new Date(d.datetime)))
      .y((d) => y(Duration.fromISO(d.time).toMillis() / 1000));

    const incorrectLine = line<Result>()
      .x((d) => x(new Date(d.datetime)))
      .y((d) => y2(d.incorrect));

    g.append("path")
      .datum(computedResults)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3.5)
      .attr("d", timeLine);

    g.append("path")
      .datum(computedResults)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 3.5)
      .attr("d", incorrectLine);
  }, [results, keyboard, width, height]);

  return <svg ref={svgRef} className="mx-auto" />;
}
