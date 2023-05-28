"use client";
import { useState } from "react";
import { Auth } from "aws-amplify";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Formik, Form, Field } from "formik";
import { useUser } from "@/lib/user_hook";

export default function Account({ onError }) {
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useUser()

  // console.log(user);

  const signOut = async () => {
    setSubmitting(true);
    await Auth.signOut();
    setUser(null)
    setSubmitting(false);
  };

  if (!user) {
    onError()
    return null
  }

  return (
    <div className="h-full">
      <div className="flex min-h-full max-h-[80vh] max-w-5xl">
        <div className="flex flex-1 flex-col justify-center px-4 py-12 overflow-y-scroll">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Account Details
              </h2>

              <Formik
                initialValues={{
                  email: user.attributes.email,
                  phone: user.attributes.phone_number,
                  name: user.attributes.name,
                }}
                onSubmit={async (values) => {
                  await Auth.updateUserAttributes(user, {
                    email: values.email,
                    name: values.name,
                    phone_number: values.phone,
                  });

                  const updatedUser = await Auth.currentAuthenticatedUser()
                  setUser(updatedUser)
                  setSubmitting(false);
                }}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                      <div className="sm:col-span-4">
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Email
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                            <Field
                              type="email"
                              name="email"
                              id="email"
                              autoComplete="email"
                              className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                      <div className="sm:col-span-4">
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Phone Number
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                            <Field
                              type="text"
                              name="phone"
                              id="phone"
                              autoComplete="phone_number"
                              className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                      <div className="sm:col-span-4">
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Name
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                            <Field
                              type="text"
                              name="name"
                              id="name"
                              autoComplete="name"
                              className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      {!isSubmitting ? (
                        "Update"
                      ) : (
                        <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                      )}
                    </Button>
                  </Form>
                )}
              </Formik>

              <Button onClick={signOut} disabled={submitting}>
                {!submitting ? (
                  "Sign Out"
                ) : (
                  <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
