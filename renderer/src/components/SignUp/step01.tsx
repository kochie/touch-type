import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faEye, faEyeSlash } from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Formik, Field, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import Button from "../Button";
import Error from "../Errors";
import { useState } from "react";
import { Transition } from "@headlessui/react";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { metrics } from "@/lib/metrics";

const SignupSchema = Yup.object().shape({
  name: Yup.string().max(50, "Too Long!").required("Required"),
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

export default function Step01({ onContinue }) {
  const [formErrors, setFormErrors] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const supabase = useSupabaseClient();

  return (
    <Formik
      initialValues={{
        name: "",
        password: "",
        email: "",
      }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setFormErrors("");

        metrics.count("auth.signup_attempt");
        try {
          const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
              data: {
                name: values.name,
              },
            },
          });

          if (error) {
            throw error;
          }

          // Supabase anti-enumeration: when an email is already registered,
          // /signup returns 200 with a synthetic user whose `identities` is
          // an empty array — and no confirmation email is sent. Without this
          // branch the user lands on "check your email" while no email is
          // ever delivered, which especially hurts Cognito-migrated users
          // whose placeholder password they don't know.
          if (data.user && (data.user.identities?.length ?? 0) === 0) {
            metrics.count("auth.signup_duplicate");
            setFormErrors(
              "If you already have an account, please sign in instead — or reset your password if you don't remember it.",
            );
            return;
          }

          metrics.count("auth.signup_success");
          setSubmitting(false);
          setStatus("COMPLETE");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          onContinue(values);
        } catch (error: any) {
          setFormErrors(error.message || String(error));
        }

        setSubmitting(false);
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
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              {errors.email && touched.email && (
                <ErrorMessage name="email">
                  {(msg) => (
                    <p className="mt-2 text-sm text-red-600" id="email-error">
                      {msg}
                    </p>
                  )}
                </ErrorMessage>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Password
            </label>
            <div className="mt-2 relative">
              <Field
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="block w-full rounded-md border-0 py-1.5 pr-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
              </button>
            </div>
            {errors.password && touched.password && (
              <ErrorMessage name="password">
                {(msg) => (
                  <p
                    className="mt-2 text-sm text-red-600"
                    id="password-error"
                  >
                    {msg}
                  </p>
                  )}
                </ErrorMessage>
              )}
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Name
            </label>
            <div className="mt-2">
              <Field
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              {errors.name && touched.name && (
                <ErrorMessage name="name">
                  {(msg) => (
                    <p className="mt-2 text-sm text-red-600" id="name-error">
                      {msg}
                    </p>
                  )}
                </ErrorMessage>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && "Sign Up"}
              {!isSubmitting && status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
