import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import { Transition } from "@headlessui/react";

import { Auth } from "aws-amplify";
import { useState } from "react";
import Error from "../Errors";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/lib/user_hook";

const SignupSchema = Yup.object().shape({
  code: Yup.string().length(6).required(),
  email: Yup.string().email().required(),
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

export default function Step02({ onContinue, email }) {
  const [formErrors, setFormErrors] = useState<string>();
  const [_, setUser] = useUser();

  return (
    <Formik
      initialValues={{
        email: email,
        code: "",
      }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        // alert(JSON.stringify(values, null, 2));
        setFormErrors("");

        try {
          await Auth.confirmSignUp(values.email, values.code);

          setSubmitting(false);
          setStatus("COMPLETE");

          // await new Promise((resolve) => setTimeout(resolve, 1000));

          const user = await Auth.currentAuthenticatedUser();
          setUser(user);
          onContinue();
        } catch (error) {
          setFormErrors(error);
        }

        setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched, status }) => (
        <Form className="space-y-6">
          <Transition
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
                disabled
                autoComplete="email"
                required
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 "
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
              htmlFor="code"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Authentication Code
            </label>
            <div className="mt-2">
              <Field
                id="code"
                name="code"
                type="text"
                autoComplete="otp"
                required
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              {errors.code && touched.code && (
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
          </div>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              //   className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && "Confirm Sign Up"}
              {!isSubmitting && status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
