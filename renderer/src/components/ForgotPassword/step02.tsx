"use client";
import { useEffect, useRef, useState } from "react";
import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { OtpInput } from "../OtpInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Error from "../Errors";
import { Transition } from "@headlessui/react";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { friendlyAuthError } from "@/lib/auth-errors";

const Schema = Yup.object().shape({
  code: Yup.string().length(8, "Code must be 8 digits").required("Required"),
  password: Yup.string().min(8, "Password must be at least 8 characters").required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Required"),
});

const RESEND_COOLDOWN_SECONDS = 60;

const Spinner = (
  <FontAwesomeIcon icon={faSpinner} className="text-white" spin={true} size="xl" />
);
const Tick = (
  <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />
);

interface Step02Props { email: string; onContinue: () => void }

export function Step02({ email, onContinue }: Step02Props) {
  const [formErrors, setFormErrors] = useState<string>();
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = useSupabaseClient();

  // Start with a 60s cooldown on mount — the user just triggered a send in
  // Step01, so don't let them immediately spam another.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setFormErrors("");
    try {
      // Mirror Step01's redirectTo so the resend email lands on the website
      // set-password page instead of the bare root if the user clicks rather
      // than typing the OTP code.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://touch-typer.kochie.io/auth/callback?next=/auth/set-password",
      });
      if (error) throw error;
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1 && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return Math.max(0, s - 1);
        });
      }, 1000);
    } catch (err: unknown) {
      setFormErrors(friendlyAuthError(err, "Couldn't resend the code."));
    } finally {
      setResending(false);
    }
  }

  return (
    <Formik
      initialValues={{ code: "", password: "", confirmPassword: "" }}
      initialStatus="PENDING"
      validationSchema={Schema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setFormErrors("");
        let signedInByOtp = false;
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: values.code,
            type: "recovery",
          });
          if (verifyError) throw verifyError;
          // verifyOtp leaves the user authenticated. From this moment until
          // updateUser returns, an unrecovered failure must NOT leave the
          // bearer with a live Supabase session.
          signedInByOtp = true;

          const { error: updateError } = await supabase.auth.updateUser({
            password: values.password,
          });
          if (updateError) throw updateError;

          setStatus("COMPLETE");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          onContinue();
        } catch (error: unknown) {
          // If verifyOtp succeeded but updateUser failed, sign out so a
          // partial recovery doesn't leak an authenticated session.
          if (signedInByOtp) {
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.warn("Failed to sign out after partial recovery:", signOutErr);
            }
          }
          setFormErrors(friendlyAuthError(error, "Couldn't reset password."));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, errors, touched, status, values, setFieldValue, setFieldTouched }) => (
        <Form className="space-y-6">
          <Transition
            as="div"
            appear={true}
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

          <p className="text-sm text-gray-500">
            An 8-digit code was sent to <span className="font-medium text-gray-700">{email}</span>.
            Enter it below along with your new password.
          </p>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-3">
              Recovery Code
            </label>
            <OtpInput
              length={8}
              value={values.code}
              onChange={(val) => setFieldValue("code", val)}
              onBlur={() => setFieldTouched("code", true)}
              disabled={isSubmitting}
              hasError={!!(errors.code && touched.code)}
            />
            {errors.code && touched.code && (
              <p className="mt-2 text-xs text-red-500 text-center">{errors.code}</p>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:hover:text-gray-400"
            >
              {resending
                ? "Resending…"
                : resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
              New Password
            </label>
            <div className="mt-2">
              <Field
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            {errors.password && touched.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900">
              Confirm New Password
            </label>
            <div className="mt-2">
              <Field
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            {errors.confirmPassword && touched.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && "Reset Password"}
              {status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
