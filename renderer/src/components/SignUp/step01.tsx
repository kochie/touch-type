import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Formik, Field, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import Button from "../Button";

import { signUp } from "aws-amplify/auth";
import Error from "../Errors";
import { useState } from "react";

import { Transition } from "@headlessui/react";

const SignupSchema = Yup.object().shape({
  name: Yup.string().max(50, "Too Long!").required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(8).required(),
  phone: Yup.string().required(),
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

  return (
    <Formik
      initialValues={{
        name: "",
        password: "",
        email: "",
        phone: "",
      }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        // alert(JSON.stringify(values, null, 2));
        setFormErrors("");

        try {
          await signUp({
            options: {
              autoSignIn: true,
              userAttributes: {
                email: values.email,
                phone_number: values.phone,
                name: values.name,
              },
            },
            password: values.password,
            username: values.email,
          });

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
            <div className="mt-2">
              <Field
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
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
            <label
              htmlFor="phone"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Phone Number (for MFA)
            </label>
            <div className="mt-2">
              <Field
                id="phone"
                name="phone"
                type="tel"
                autoComplete="phone"
                required
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              {errors.phone && touched.phone && (
                <ErrorMessage name="phone">
                  {(msg) => (
                    <p className="mt-2 text-sm text-red-600" id="phone-error">
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
              {!isSubmitting && status === "PENDING" && "Sign Up"}
              {!isSubmitting && status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
