import { Barline, LineChart } from "@/components/Charts";
import TopStats from "@/components/Stats";
import React from "react";

const StatsPage = () => {
  return (
    <div >
      <div className="">
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
