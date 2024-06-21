"use client";
import { use, useEffect, useState } from "react";
import { deleteUser, fetchUserAttributes, getCurrentUser, signOut, updateUserAttributes } from "aws-amplify/auth";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Formik, Form, Field } from "formik";
import { useUser } from "@/lib/user_hook";

export default function Account({ onError, onCancel, onChangePassword }) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const user = useUser();

  const handleSignOut = async () => {
    setSubmitting(true);
    await signOut();
    onError()
    setSubmitting(false);
  };

  const deleteAccount = async () => {
    setDeleteSubmitting(true);

    if (
      confirm(
        "For real, this will delete your account and all data associated with it. Are you sure?"
      )
    ) {
      await deleteUser();
    }
    setDeleteSubmitting(false);
  };

  useEffect(() => {
    if (user === null) {
      onError();
    }
  }, [user])

  if (!user) return null

  const attributes = use(fetchUserAttributes().catch(error => {
    onError()
    return {
      email: "",
      phone_number: "",
      name: ""
    }
  }))

  return (
    <div className="h-full">
      <div className="flex min-h-full max-h-[80vh] max-w-7xl">
        <div className="flex flex-1 flex-col justify-center mx-8 my-12">
          <div className="mx-auto w-full">
            <div>
              <h2 className="text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Account Details
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Change details associated with your account.
              </p>

              <Formik
                initialValues={{
                  email: attributes.email,
                  phone: attributes.phone_number,
                  name: attributes.name,
                }}
                onSubmit={async (values) => {
                  await updateUserAttributes({
                    userAttributes: {
                      email: values.email,
                    name: values.name,
                    phone_number: values.phone,
                    }
                  });

                  setSubmitting(false);
                }}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mt-5 grid grid-cols-4 gap-3">
                      <div className="col-span-4">
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Name
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                            <Field
                              type="text"
                              name="name"
                              id="name"
                              autoComplete="name"
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
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
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
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
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-x-6">
                      <div className="gap-6 flex">
                        <button
                          onClick={handleSignOut}
                          disabled={submitting}
                          type="button"
                          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                        >
                          {!submitting ? (
                            "Sign Out"
                          ) : (
                            <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={onChangePassword}
                          className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        >
                          Change Password
                        </button>
                      </div>

                      <div className="w-min gap-6 flex">
                        <button
                          type="button"
                          onClick={onCancel}
                          className="text-sm font-semibold leading-6 text-gray-900"
                        >
                          Cancel
                        </button>
                        <Button type="submit" disabled={isSubmitting}>
                          {!isSubmitting ? (
                            "Update"
                          ) : (
                            <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}
              </Formik>

              <div className="border-b border-gray-900/10 my-6" />

              <div>
                <h2 className="text-base font-semibold leading-7 text-gray-900">
                  Danger Zone
                </h2>

                <div className="flex gap-12">
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Permanently delete your acccount and all information
                    associated with it.
                  </p>
                  <button
                    onClick={deleteAccount}
                    type="button"
                    disabled={deleteSubmitting}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    {!deleteSubmitting ? (
                      "Delete Account"
                    ) : (
                      <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
