import Logo from "@/assets/logo.svg";
import Image from "next/image";

import Step01 from "./step01";
import { useReducer } from "react";
import Step02 from "./step02";
import Step03 from "./step03";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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


export default function SignUp({ toSignIn, onClose }) {
  const [{ stage, email }, dispatch] = useReducer(reducer, {
    stage: "STEP_01",
  });

  return (
    <div className="h-full">
      <div className="flex min-h-full max-h-[80vh] max-w-5xl">
        <div className="flex flex-1 flex-col justify-center px-4 py-12 overflow-y-scroll">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
                {stage === "STEP_01" && "Sign up for an account"}
                {stage === "STEP_02" && "Confirm your account details"}
                {stage === "STEP_03" && "Done! Your account is ready to go!"}
              </h2>
            </div>

            <div className="mt-10">
              <div>
                {stage === "STEP_01" && (
                  <Step01
                    onContinue={(values) =>
                      dispatch({ type: "STEP_02", email: values.email })
                    }
                  />
                )}
                {stage === "STEP_02" && (
                  <Step02
                    onContinue={() => {
                      dispatch({ type: "STEP_03" });
                    }}
                    email={email}
                  />
                )}
                {stage === "STEP_03" && <Step03 onClose={onClose} />}
                <p className="mt-10 text-center text-sm text-gray-500">
                  Already a member?{" "}
                  <a
                    onClick={toSignIn}
                    className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
                  >
                    Sign In Here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative block flex-1 bg-black overflow-hidden">
          <Image
            className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm scale-105 bg-black"
            src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
            alt=""
            fill
          />
          <div className="relative flex flex-col justify-center my-10 mx-16">
            <Image className="h-16 w-auto" src={Logo} alt="Your Company" />
            <div className="text-white text-sm">
              <p className="my-5 text-base">
                Sign up today for a whole bunch of new features!
              </p>
              <ul className="list-disc ml-3 list-outside">
                <li className="my-2">
                  ☁️ Cloud sync of your results. Take your progress with you
                  from one device to the other.
                </li>
                <li className="my-2">
                  📊 More charts! See all your data and analytics across more
                  charts and diagram. Download your data at any time to use and
                  compare offline.
                </li>
                <li className="my-2">
                  🧑‍💻 Support the development of Touch Typer by getting an annual
                  pass to our premium features.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
