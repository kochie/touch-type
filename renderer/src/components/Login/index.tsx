"use client";

import { useState } from "react";
import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { toast } from "sonner";

const MAGIC_LINK_CALLBACK = "https://touch-typer.kochie.io/auth/callback";

const SignupSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(8).required(),
});

const Spinner = (
  <FontAwesomeIcon
    icon={faSpinner}
    className="text-white"
    spin={true}
    size="xl"
  />
);

const Tick = (
  <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />
);

export default function Login({ onSignUp, onContinue, onForgetPassword }) {
  const supabase = useSupabaseClient();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");

  return (
    <>
      <div className="flex min-h-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm lg:w-96">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 mx-auto w-full max-w-lg">
          {magicLinkSent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  We sent a sign-in link to <strong>{magicLinkEmail}</strong>. Open the link in your browser to sign in, then you can use &quot;Open in app&quot; there or sign in here with your password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Sign in with password instead
              </button>
            </div>
          ) : (
          <Formik
            initialValues={{
              password: "",
              email: "",
            }}
            initialStatus={"PENDING"}
            validationSchema={SignupSchema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                const { data, error } = await supabase.auth.signInWithPassword({
                  email: values.email,
                  password: values.password,
                });

                if (error) {
                  throw error;
                }

                setSubmitting(false);
                setStatus("COMPLETE");
                await new Promise((resolve) => setTimeout(resolve, 1000));
                
                onContinue(values);
              } catch (error: any) {
                console.error(error);
                toast.error(error.message || "Failed to sign in");
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched, status }) => (
              <Form className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Email address
                  </label>
                  <div className="mt-2">
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Password
                    </label>
                    <div className="text-sm">
                      <a
                        onClick={onForgetPassword}
                        className="font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        Forgot password?
                      </a>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Field
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && status === "PENDING" && Spinner}
                    {!isSubmitting && status === "PENDING" && "Sign In"}
                    {!isSubmitting && status === "COMPLETE" && Tick}
                  </Button>
                </div>
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      const email = (document.getElementById("email") as HTMLInputElement)?.value;
                      if (!email) {
                        toast.error("Enter your email first");
                        return;
                      }
                      try {
                        const { error } = await supabase.auth.signInWithOtp({
                          email,
                          options: { emailRedirectTo: MAGIC_LINK_CALLBACK },
                        });
                        if (error) throw error;
                        setMagicLinkEmail(email);
                        setMagicLinkSent(true);
                        toast.success("Check your email for the sign-in link.");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed to send link");
                      }
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Email me a link instead
                  </button>
                </div>
              </Form>
            )}
          </Formik>
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
