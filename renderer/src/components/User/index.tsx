"use client";
// import { headers } from "next/headers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faUser } from "@fortawesome/pro-duotone-svg-icons";
import { useUser } from "@/lib/user_hook";

export default function User({ signIn, account }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div title="Loading...">
        <FontAwesomeIcon
          icon={faSpinner}
          className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
          size="lg"
          spin
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div onClick={signIn} title="Sign In or Sign Up">
        <FontAwesomeIcon
          icon={faRightToBracket}
          className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
          size="lg"
          // spin={}
        />
      </div>
    );
  }

  return (
    <div onClick={account} title="Account">
      <FontAwesomeIcon
        icon={faUser}
        className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
        size="lg"
        // spin={}
      />
    </div>
  );
}
