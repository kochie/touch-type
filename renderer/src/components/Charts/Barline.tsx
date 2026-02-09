"use client";
import { useEffect, useRef, useState } from "react";
import {
  axisBottom,
  axisLeft,
  axisRight,
  InternSet,
  interpolateBlues,
  interpolateCool,
  interpolateGreens,
  interpolateGreys,
  interpolateOranges,
  interpolatePurples,
  interpolateReds,
  interpolateWarm,
  map,
  max,
  scaleBand,
  scaleLinear,
  scaleSequential,
  select,
} from "d3";
import { Duration } from "luxon";
import { range } from "lodash";

import styles from "@/styles/stats.module.css";
import { Result, useResults } from "@/lib/result-provider";
import { Levels } from "@/lib/settings_hook";

const marginTop = 20; // the top margin, in pixels
const marginRight = 40; // the right margin, in pixels
const marginBottom = 100; // the bottom margin, in pixels
const marginLeft = 40;

interface BarlineProps {
  /** Single keyboard (e.g. for heatmap page) */
  keyboard?: string;
  /** Multiple keyboards: combined stats from all selected (e.g. stats page) */
  keyboards?: string[];
}

export default function Barline({ keyboard, keyboards }: BarlineProps) {
  const { results } = useResults();
  const [computedResults, setComputedResults] = useState<Result[]>([]);

  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  const effectiveKeyboards = keyboards?.length
    ? keyboards
    : keyboard
      ? [keyboard]
      : [];

  useEffect(() => {
    const resize = () => {
      setSize({
        width: window.innerWidth * 0.8,
        height: window.innerHeight * 0.5,
      });
    };
    window.addEventListener("resize", resize);
    resize();

    const keySet = new Set(effectiveKeyboards);
    const computed = results
      .filter((res) => keySet.has(res.keyboard))
      .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

    setComputedResults(computed);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [results, effectiveKeyboards.join(",")]);

  useEffect(() => {
    if (!svgRef.current) return;

    // const width = window.innerWidth * 0.8;
    // const height = window.innerHeight * 0.5;

    const svg = select(svgRef.current);

    const CHART_SIZE = 75;

    const dummyData = Array(
      CHART_SIZE - Math.min(computedResults.length, CHART_SIZE),
    )
      .fill(null)
      .map(() => ({
        correct: 10,
        incorrect: 0,
        cpm: Math.random() * 200,
        level: Levels.LEVEL_0,
      }));

    const data = [
      ...dummyData,
      ...computedResults.slice(
        Math.max(computedResults.length - CHART_SIZE, 0),
        computedResults.length,
      ),
    ];

    const X = map(data, (x, i) => i);
    const Y = map(data, (y) => y.cpm);
    const Y2 = map(data, (y) => y.incorrect);
    const LEVEL = map(data, (y) => y.level ?? Levels.LEVEL_3);

    const xDomain = new InternSet(X);
    const yDomain = new InternSet([0, max(Y)!]);
    const yDomain2 = new InternSet([0, max(Y2)!]);

    const xRange = [marginLeft, width - marginRight];
    const yRange = [height - marginBottom, marginTop];
    const yRange2 = [height - marginBottom, height];

    const xPadding = 0;
    const yFormat = "0f";
    const yLabel = "";
    const color = "steelblue";

    const xScale = scaleBand(xDomain, xRange).padding(xPadding);
    const yScale = scaleLinear(yDomain, yRange);
    const yScale2 = scaleLinear(yDomain2, yRange2);

    const xAxis = axisBottom(xScale).tickSizeOuter(0);
    const yAxis = axisRight(yScale).ticks(height / 100, yFormat);
    const yAxis2 = axisLeft(yScale2).ticks(height / 40, yFormat);

    const I = range(X.length).filter((i) => {
      return xDomain.has(X[i]);
    });

    const reds = scaleSequential(yDomain2, interpolateReds);

    const levelColors = {
      [Levels.LEVEL_0]: scaleSequential(yDomain, interpolateGreys),
      [Levels.LEVEL_1]: scaleSequential(yDomain, interpolateBlues),
      [Levels.LEVEL_2]: scaleSequential(yDomain, interpolateGreens),
      [Levels.LEVEL_3]: scaleSequential(yDomain, interpolateOranges),
      [Levels.LEVEL_4]: scaleSequential(yDomain, interpolatePurples),
      [Levels.LEVEL_5]: scaleSequential(yDomain, interpolateCool),
      [Levels.LEVEL_6]: scaleSequential(yDomain, interpolateWarm),
    };

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    svg
      .append("g")
      .attr("transform", `translate(${width - marginRight},0)`)
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", -width + marginLeft + marginRight)
          .attr("stroke-dasharray", "5,5"),
      );

    const div = select("body")
      .append("div")
      .attr("class", styles.tooltip)
      .style("opacity", 0);

    const bar = svg
      .append("g")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .selectAll("rect")
      .data(I)
      .join("rect")
      .attr("fill", (i: number) => {
        const color = levelColors[LEVEL[i]];
        return color(Y[i]);
      })
      .attr("x", (i: number) => xScale(X[i]) ?? 0)
      .attr("y", (i: number) => {
        return isNaN(yScale(Y[i])) ? 0 : yScale(Y[i]);
      })
      .attr("height", (i: number) => {
        const h = yScale(0) - yScale(Y[i]);
        return isNaN(Math.max(h, 0)) ? 0 : Math.max(h, 0);
      })
      .attr("width", xScale.bandwidth())
      .on("mouseover", function (d, i: number) {
        if (LEVEL[i] === Levels.LEVEL_0) return;
        select(this).transition().duration(50).attr("opacity", ".50");
        div.transition().duration(50).style("opacity", 1);
        div
          .html(
            Y[i].toFixed(0) + "cpm on Level: " + (LEVEL[i] ? LEVEL[i] : "3"),
          )
          .style("left", d.pageX + 10 + "px")
          .style("top", d.pageY - 15 + "px");
      })
      .on("mouseout", function (d, i) {
        select(this).transition().duration(50).attr("opacity", "1");
        div.transition().duration(50).style("opacity", 0);
      });

    const bar1 = svg
      .append("g")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .selectAll("rect")
      .data(I)
      .join("rect")
      .attr("fill", (i: number) => reds(Y2[i]))
      .attr("x", (i: number) => xScale(X[i]) ?? 0)
      .attr("y", (i) => {
        return isNaN(yScale2(0)) ? 0 : yScale2(0);
      })
      .attr("height", (i: number) => {
        const h = yScale2(0) - yScale2(Y2[i]);
        return isNaN(Math.max(-h, 0)) ? 0 : Math.max(-h, 0);
      })
      .attr("width", xScale.bandwidth())
      .on("mouseover", function (d, i: number) {
        select(this).transition().duration(50).attr("opacity", ".50");
        div.transition().duration(50).style("opacity", 1);
        div
          .html(Y2[i].toFixed(0) + " typos")
          .style("left", d.pageX + 10 + "px")
          .style("top", d.pageY - 15 + "px");
      })
      .on("mouseout", function (d, i) {
        select(this).transition().duration(50).attr("opacity", "1");
        div.transition().duration(50).style("opacity", 0);
      });

    return () => {
      svg.selectAll("*").remove();
      div.remove();
    };
  }, [width, height, computedResults]);

  return <svg ref={svgRef} className="mx-auto" />;
}
