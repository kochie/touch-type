"use client"
import { useEffect, useRef, useState } from "react";
import {
    axisBottom,
    axisLeft,
    axisRight,
    InternSet,
    interpolateBlues,
    interpolateGreens,
    interpolateOranges,
    interpolatePurples,
    interpolateReds,
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

const marginTop = 20; // the top margin, in pixels
const marginRight = 40; // the right margin, in pixels
const marginBottom = 100; // the bottom margin, in pixels
const marginLeft = 40;

interface Result {
  correct: number;
  incorrect: number;
}

export default function Barline() {

  const [results, setResults] = useState<Result[]>([]);

  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

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
    const computed = storedResults.map((res) => ({
      ...res,
      cpm:
        (res.correct + res.incorrect) /
        (Duration.fromISO(res.time).toMillis() / 1000 / 60),
    }));
    setResults(computed);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // const width = window.innerWidth * 0.8;
    // const height = window.innerHeight * 0.5;

    const svg = select(svgRef.current);

    const CHART_SIZE = 75;
    const data = [
      ...Array(CHART_SIZE - Math.min(results.length, CHART_SIZE)).fill({
        correct: 0,
        incorrect: 0,
        cpm: 0,
        level: 0,
      }),
      ...results.slice(
        Math.max(results.length - CHART_SIZE, 0),
        results.length
      ),
    ];

    const X = map(data, (x, i) => i);
    const Y = map(data, (y) => y.cpm);
    const Y2 = map(data, (y) => y.incorrect);
    const LEVEL = map(data, (y) => y.level);

    const xDomain = new InternSet(X);
    const yDomain = new InternSet([0, max(Y)]);
    const yDomain2 = new InternSet([0, max(Y2)]);

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

    const blues = scaleSequential(yDomain, interpolateBlues);
    const greens = scaleSequential(yDomain, interpolateGreens);
    const oranges = scaleSequential(yDomain, interpolatePurples);

    const reds = scaleSequential(yDomain2, interpolateReds);

    const levelColors = [oranges, greens, blues];

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    // .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

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
          // .attr("stroke-opacity", 0.5)
          // .attr("stroke", )
          .attr("stroke-dasharray", "5,5")
      );

    // svg
    //   .append("g")
    //   .attr("transform", `translate(${marginLeft},0)`)
    //   .call(yAxis2)
    //   .call((g) => g.select(".domain").remove())
    //   .call((g) =>
    //     g
    //       .selectAll(".tick line")
    //       .clone()
    //       .attr("x2", width - marginLeft - marginRight)
    //       .attr("stroke-opacity", 0.5)
    //   )
    //   .call((g) =>
    //     g
    //       .append("text")
    //       .attr("x", -marginLeft)
    //       .attr("y", 10)
    //       .attr("fill", "currentColor")
    //       // .attr("stroke", "red")
    //       .attr("text-anchor", "start")
    //       .text(yLabel)
    //   );
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
        const color = LEVEL[i] > 0 ? levelColors[LEVEL[i] - 1] : blues;
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
        select(this).transition().duration(50).attr("opacity", ".50");
        div.transition().duration(50).style("opacity", 1);
        // let num = Math.round((d.value / d.data.all) * 100).toString() + "%";
        div
          .html(
            Y[i].toFixed(0) + "cpm on Level: " + (LEVEL[i] ? LEVEL[i] : "3")
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
        // let num = Math.round((d.value / d.data.all) * 100).toString() + "%";
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
  }, [width, height, results]);
    return <svg ref={svgRef} className="mx-auto" />  
}