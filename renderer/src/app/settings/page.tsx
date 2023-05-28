import { faChartColumn, faKeyboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React from "react";
import Settings from "@/components/settings/settings";

const SettingsPage = () => {
  return (
    <div className="w-screen h-screen dark:text-white ">
      <div className="h-20">
        <div className="hover:animate-pulse absolute top-8 left-8">
          <Link href={"/stats"}>
            <FontAwesomeIcon
              icon={faChartColumn}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
            />
          </Link>
        </div>
        <div className="hover:animate-pulse absolute top-8 right-8">
          <Link href={"/"}>
            <FontAwesomeIcon
              icon={faKeyboard}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
            />
          </Link>
        </div>
      </div>

      <Settings />
    </div>
  );
};

export default SettingsPage;