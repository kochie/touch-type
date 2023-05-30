"use client";
import { Barline, LineChart } from "@/components/Charts";
import TopStats from "@/components/Stats";
import { faGear, faKeyboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React from "react";


const StatsPage = () => {

  return (
    <div className="w-screen min-h-screen dark:text-white">
      <div className="">
        <div className="hover:animate-spin fixed top-8 right-8 ">
          <Link href={"/settings"}>
            <FontAwesomeIcon
              icon={faGear}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
              // spin={}
            />
          </Link>
        </div>
        <div className="hover:animate-pulse fixed top-8 left-8">
          <Link href={"/"}>
            <FontAwesomeIcon
              icon={faKeyboard}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
            />
          </Link>
        </div>
        <div>
          {/* <h1>Stats Page</h1> */}
          <div className="py-32">
            {/* {results.map((result) => (
              <div>
                <p>Correct: {result.correct}</p>
                <p>Incorrect: {result.incorrect}</p>
                <p>Time: {Duration.fromISO(result.time).toHuman()}</p>
              </div>
            ))} */}

            <TopStats />
            <Barline />
            <LineChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
