"use client";
import { useEffect, useState } from "react";
import {
  deleteUser,
  fetchUserAttributes,
  signOut,
  updateUserAttributes,
} from "aws-amplify/auth";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Formik, Form, Field } from "formik";
import { useUser } from "@/lib/user_hook";
import { useQuery } from "@apollo/client";
import { GET_SUBSCRIPTION } from "@/transactions/getSubscription";
import { Plan } from "@/generated/graphql";
import { faArrowsRotate } from "@fortawesome/pro-duotone-svg-icons";

enum PlanType {
  FREE = "free",
  PREMIUM = "premium",
}

const features = {
  [PlanType.FREE]: ["Settings Sync", "Cloud Saves", "Leaderboard Access"],
  [PlanType.PREMIUM]: ["AI Tutor", "Progress Reports"],
};

export default function Account({ onError, onCancel, onChangePassword }) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [attributes, setAttributes] = useState({
    email: "",
    phone_number: "",
    name: "",
    preferred_username: "",
  });
  const user = useUser();

  const handleSignOut = async () => {
    setSubmitting(true);
    await signOut();
    onError();
    setSubmitting(false);
  };

  const deleteAccount = async () => {
    setDeleteSubmitting(true);

    if (
      confirm(
        "For real, this will delete your account and all data associated with it. Are you sure?",
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

    fetchUserAttributes()
      .then((attributes) => {
        setAttributes((prev) => ({ ...prev, ...attributes }));
      })
      .catch((error) => {
        onError();
      });
  }, [user]);

  if (!user) return null;

  const { data, loading, error, refetch } = useQuery<{ subscription: Plan }>(
    GET_SUBSCRIPTION,
  );

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

              {/* <Link href="/account/billing">Billing</Link> */}

              <Formik
                enableReinitialize={true}
                initialValues={{
                  email: attributes.email,
                  phone: attributes.phone_number,
                  name: attributes.name,
                  username: attributes.preferred_username,
                }}
                onSubmit={async (values) => {
                  await updateUserAttributes({
                    userAttributes: {
                      email: values.email,
                      name: values.name,
                      phone_number: values.phone,
                      preferred_username: values.username,
                    },
                  });

                  setSubmitting(false);
                }}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mt-5 grid grid-cols-6 gap-3">
                      <div className="col-span-3">
                        <label
                          htmlFor="username"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Username
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                            <Field
                              type="text"
                              name="username"
                              id="username"
                              autoComplete="username"
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
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
                      <div className="col-span-3">
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
                      <div className="col-span-3">
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
                  Account Features
                </h2>

                <div className="flex gap-12 justify-between">
                  <div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Control what features are available to you.
                    </p>

                    {error && (
                      <div className="text-black">
                        <p>There was an error checking your subscription</p>
                      </div>
                    )}

                    {loading || !data ? (
                      <p className="text-black">Loading...</p>
                    ) : (
                      <>
                        <p className="text-gray-600 text-sm leading-6">
                          <span>You're currently on the</span>
                          <span className="mx-1 inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            {data.subscription.billing_plan}
                          </span>
                          <span>plan.</span>
                        </p>
                        <div className="flex gap-1 mt-4">
                          {features[data.subscription.billing_plan!]?.map(
                            (feature) => (
                              <span
                                key={feature}
                                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                              >
                                {feature}
                              </span>
                            ),
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <button
                      className="w-12 text-black"
                      onClick={(event) => {
                        event.preventDefault();
                        setReloading(true);
                        refetch().then(()=>setReloading(false));
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faArrowsRotate}
                        spin={reloading}
                        size="lg"
                      />
                    </button>
                    <button
                      onClick={(event) => {
                        // require('electron').shell.openExternal("https://google.com");
                        event.preventDefault();
                        // TODO: Replace with actual link
                        window.open("http://localhost:3000/account", "_blank");
                      }}
                      type="button"
                      disabled={deleteSubmitting}
                      className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                    >
                      Change Plan
                    </button>
                  </div>
                </div>
              </div>

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
