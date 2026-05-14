"use client";
import { useState } from "react";
import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Error from "../Errors";
import { Transition } from "@headlessui/react";
import { useSupabaseClient } from "@/lib/supabase-provider";

const Schema = Yup.object().shape({
  code: Yup.string().length(6, "Code must be 6 digits").required("Required"),
  password: Yup.string().min(8, "Password must be at least 8 characters").required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Required"),
});

const Spinner = (
  <FontAwesomeIcon icon={faSpinner} className="text-white" spin={true} size="xl" />
);
const Tick = (
  <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />
);

export function Step02({ email, onContinue }) {
  const [formErrors, setFormErrors] = useState<string>();
  const supabase = useSupabaseClient();

  return (
    <Formik
      initialValues={{ code: "", password: "", confirmPassword: "" }}
      initialStatus="PENDING"
      validationSchema={Schema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setFormErrors("");
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: values.code,
            type: "recovery",
          });
          if (verifyError) throw verifyError;

          const { error: updateError } = await supabase.auth.updateUser({
            password: values.password,
          });
          if (updateError) throw updateError;

          setStatus("COMPLETE");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          onContinue();
        } catch (error: any) {
          setFormErrors(error.message || String(error));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, errors, touched, status }) => (
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
            A 6-digit code was sent to <span className="font-medium text-gray-700">{email}</span>.
            Enter it below along with your new password.
          </p>

          <div>
            <label htmlFor="code" className="block text-sm font-medium leading-6 text-gray-900">
              Recovery Code
            </label>
            <div className="mt-2">
              <Field
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            {errors.code && touched.code && (
              <p className="mt-1 text-xs text-red-500">{errors.code}</p>
            )}
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
