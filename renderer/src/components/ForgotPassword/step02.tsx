"use client";
import { useState } from "react";
import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Auth } from "aws-amplify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Error from "../Errors";
import { Transition } from "@headlessui/react";

const SignupSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
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

export function Step02({ email, onContinue }) {
  const [formErrors, setFormErrors] = useState<string>();

  return (
    <Formik
      initialValues={{
        email: email,
        code: "",
        password: "",
      }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        // alert(JSON.stringify(values, null, 2));
        setFormErrors("");

        try {
          await Auth.forgotPasswordSubmit(
            values.email,
            values.code,
            values.password
          );

          setSubmitting(false);
          setStatus("COMPLETE");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          onContinue(values);
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
                autoComplete="email"
                disabled
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              New Password
            </label>
            <div className="mt-2">
              <Field
                id="password"
                name="password"
                type="password"
                autoComplete="password"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Recovery Code
            </label>
            <div className="mt-2">
              <Field
                id="code"
                name="code"
                type="text"
                autoComplete="otp"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              //   className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && "Sign In"}
              {!isSubmitting && status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
