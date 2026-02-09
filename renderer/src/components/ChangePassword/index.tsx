"use client";

import { useState } from "react";
import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { toast } from "sonner";

const Schema = Yup.object().shape({
  currentPassword: Yup.string().required("Required"),
  newPassword: Yup.string().min(8, "At least 8 characters").required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords must match")
    .required("Required"),
});

const Spinner = (
  <FontAwesomeIcon icon={faSpinner} className="text-white" spin size="xl" />
);
const Tick = <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />;

export default function ChangePassword({ onClose, onSuccess }) {
  const supabase = useSupabaseClient();

  return (
    <div className="flex min-h-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm lg:w-96">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Change password
        </h2>
      </div>

      <div className="mt-10 mx-auto w-full max-w-lg">
        <Formik
          initialValues={{
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          }}
          validationSchema={Schema}
          initialStatus={"PENDING"}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user?.email) {
                toast.error("No email found");
                return;
              }
              const { error: signInError } =
                await supabase.auth.signInWithPassword({
                  email: user.email,
                  password: values.currentPassword,
                });
              if (signInError) {
                toast.error("Current password is incorrect");
                return;
              }
              const { error: updateError } = await supabase.auth.updateUser({
                password: values.newPassword,
              });
              if (updateError) throw updateError;
              setStatus("COMPLETE");
              await new Promise((r) => setTimeout(r, 800));
              onSuccess?.();
              onClose?.();
            } catch (err: unknown) {
              toast.error(
                err instanceof Error ? err.message : "Failed to update password"
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status }) => (
            <Form className="space-y-6">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Current password
                </label>
                <div className="mt-2">
                  <Field
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  New password
                </label>
                <div className="mt-2">
                  <Field
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Confirm new password
                </label>
                <div className="mt-2">
                  <Field
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && status === "PENDING" && Spinner}
                  {!isSubmitting && status === "PENDING" && "Update password"}
                  {!isSubmitting && status === "COMPLETE" && Tick}
                </Button>
                <Button type="button" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
