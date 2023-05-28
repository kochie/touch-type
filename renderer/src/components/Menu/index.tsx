import User from "@/components/User";
import {
  faChartColumn,
  faGear,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { faSparkles } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { Suspense } from "react";

export default function Menu({ handleWhatsNew, handleSignIn, handleAccount }) {
  return (
    <>
      <div className=" absolute top-8 right-8 flex gap-4">
        <Suspense
          fallback={
            <FontAwesomeIcon
              icon={faSpinner}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
              spin
            />
          }
        >
          <User signIn={handleSignIn} account={handleAccount} />
        </Suspense>
        <button onClick={handleWhatsNew} title="What's New">
          <FontAwesomeIcon
            icon={faSparkles}
            className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
            size="lg"
            // spin={}
          />
        </button>
        <Link href={"/settings"}>
          <FontAwesomeIcon
            icon={faGear}
            className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out hover:animate-spin"
            size="lg"
            // spin={}
          />
        </Link>
      </div>
      <div className="hover:animate-pulse absolute top-8 left-8">
        <Link href={"/stats"}>
          <FontAwesomeIcon
            icon={faChartColumn}
            className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
            size="lg"
          />
        </Link>
      </div>
    </>
  );
}
