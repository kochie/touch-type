"use client";
import { useEffect, useRef, useState } from "react";
import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Error from "../Errors";
import { Transition } from "@headlessui/react";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { friendlyAuthError } from "@/lib/auth-errors";
import { PASSWORD_RESET_REDIRECT_URL } from "@/lib/auth-urls";

const SignupSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
});

const RESEND_COOLDOWN_SECONDS = 60;

const Spinner = (
  <FontAwesomeIcon icon={faSpinner} className="text-white" spin size="xl" />
);
const Tick = (
  <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />
);

export interface Step01Values { email: string }
interface Step01Props { onContinue: (values: Step01Values) => void }

export function Step01({ onContinue }: Step01Props) {
  const [formErrors, setFormErrors] = useState<string>();
  // Countdown counter for the rate-limit cooldown. Supabase 429s after a
  // handful of rapid sends — disable the button locally first so users get
  // clear feedback instead of an opaque error toast.
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  return (
    <Formik
      initialValues={{ email: "" }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setFormErrors("");
        if (cooldown > 0) {
          setSubmitting(false);
          return;
        }

        try {
          // The 8-digit OTP code in the email is the primary path for the
          // desktop app (entered in Step02). The magic-link points at the
          // website's set-password page so users who click the link instead
          // of typing the code also reach a working flow. Without an explicit
          // redirectTo Supabase falls back to Site URL (bare root), which
          // strands the user.
          const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: PASSWORD_RESET_REDIRECT_URL,
          });

          if (error) throw error;

          startCooldown();
          setStatus("COMPLETE");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          onContinue(values);
        } catch (error: unknown) {
          setFormErrors(friendlyAuthError(error, "Couldn't send recovery email."));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, errors, touched, status }) => (
        <Form className="space-y-6">
          <Transition
            as="div"
            appear
            show={!!formErrors}
            enter="transition-opacity duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Error errors={formErrors} />
          </Transition>
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
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
              {errors.email && touched.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting || cooldown > 0}>
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && (cooldown > 0 ? `Wait ${cooldown}s` : "Send Reset Email")}
              {!isSubmitting && status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
