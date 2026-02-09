"use client";

import { useReducer } from "react";
import { Step01 } from "./step01";
import { Step02 } from "./step02";

const reducer = (state, action) => {
  switch (action.type) {
    case "STEP_01":
      return { ...state, stage: "STEP_01" };
    case "STEP_02":
      return { ...state, stage: "STEP_02", email: action.email };
    case "STEP_03":
      return { ...state, stage: "STEP_03" };
    default:
      return { ...state, stage: "STEP_01" };
  }
};

export default function ForgetPassword({ onSignUp, onContinue, onSignIn }) {
  const [{ stage, email }, dispatch] = useReducer(reducer, {
    stage: "STEP_01",
  });

  return (
    <>
      <div className="flex min-h-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm lg:w-96">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Recover your Account
          </h2>
        </div>

        <div className="mt-10 mx-auto w-full max-w-lg">
          {stage === "STEP_01" && (
            <Step01
              onContinue={(values) =>
                dispatch({ type: "STEP_02", email: values.email })
              }
            />
          )}
          {stage === "STEP_02" && (
            <Step02
              email={email}
              onSignIn={onSignIn}
              onClose={onContinue}
            />
          )}
          <p className="mt-10 text-center text-sm text-gray-500">
            Not a member?{" "}
            <a
              onClick={onSignUp}
              className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
