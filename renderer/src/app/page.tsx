"use client";
import { Suspense, useLayoutEffect, useReducer, useState } from "react";
import WhatsNew from "@/components/WhatsNew";
import Modal from "@/components/Modal";
import Login from "@/components/Login";
import SignUp from "@/components/SignUp";
import Account from "@/components/Account";
import Tracker from "@/components/Tracker";
import Menu from "@/components/Menu";
import { useSettings } from "@/lib/settings_hook";

const modalReducer = (state, action) => {
  switch (action.type) {
    case "WHATS_NEW":
      return {
        ...state,
        modal: "WHATS_NEW",
      };
    case "SIGN_IN":
      return {
        ...state,
        modal: "SIGN_IN",
      };
    case "SIGN_UP":
      return {
        ...state,
        modal: "SIGN_UP",
      };
    case "ACCOUNT":
      return { ...state, modal: "ACCOUNT" };
    case "NONE":
    default:
      return { ...state, modal: null };
  }
};

export default function IndexPage() {
  const settings = useSettings();

  const [{ modal }, modalDispatch] = useReducer(modalReducer, {
    modal: null,
  });

  useLayoutEffect(() => {
    const firstTimeOpen = sessionStorage.getItem("firstTimeOpen") === null;
    if (settings.whatsNewOnStartup && firstTimeOpen)
      modalDispatch({ type: "WHATS_NEW" });
  }, []);

  return (
    <div className="w-screen h-screen dark:text-white ">
      <Menu
        handleSignIn={() => modalDispatch({ type: "SIGN_IN" })}
        handleAccount={() => modalDispatch({ type: "ACCOUNT" })}
        handleWhatsNew={() => modalDispatch({ type: "WHATS_NEW" })}
      />
      <Tracker modal={modal} />
      <Modal
        open={modal === "SIGN_IN"}
        onClose={() => modalDispatch({ type: "NONE" })}
      >
        {/* <Login /> */}
        <Login
          onSignUp={() => modalDispatch({ type: "SIGN_UP" })}
          onContinue={() => modalDispatch({ type: "NONE" })}
        />
      </Modal>

      <Modal
        open={modal === "SIGN_UP"}
        onClose={() => modalDispatch({ type: "NONE" })}
      >
        {/* <Login /> */}
        <SignUp
          toSignIn={() => modalDispatch({ type: "SIGN_IN" })}
          onClose={() => modalDispatch({ type: "NONE" })}
        />
      </Modal>

      <Modal
        open={modal === "WHATS_NEW"}
        onClose={() => modalDispatch({ type: "NONE" })}
      >
        <WhatsNew
          onClose={() => {
            modalDispatch({ type: "NONE" });
            sessionStorage.setItem("firstTimeOpen", "false");
          }}
        />
      </Modal>

      <Modal
        open={modal === "ACCOUNT"}
        onClose={() => modalDispatch({ type: "NONE" })}
      >
        <Suspense>
          <Account onError={() => modalDispatch({ type: "NONE" })} />
        </Suspense>
      </Modal>
    </div>
  );
}
