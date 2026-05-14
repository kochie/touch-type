"use client";

import Button from "../Button";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { toast } from "sonner";
import { friendlyAuthError } from "@/lib/auth-errors";

const Schema = Yup.object().shape({
  currentPassword: Yup.string().required("Required"),
  password: Yup.string().min(8, "Password must be at least 8 characters").required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Required"),
});

export default function ChangePassword({ onClose }: { onClose: () => void }) {
  const supabase = useSupabaseClient();

  return (
    <div className="flex min-h-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Change Password
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Enter your current password to confirm, then choose a new one.
        </p>
      </div>

      <div className="mt-10 mx-auto w-full max-w-sm">
        <Formik
          initialValues={{ currentPassword: "", password: "", confirmPassword: "" }}
          initialStatus="PENDING"
          validationSchema={Schema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              // Re-auth with the current password BEFORE accepting the new
              // one. Supabase's updateUser only requires a valid session, so
              // without this check a stolen/unlocked session could silently
              // replace the password and lock the legitimate owner out.
              const { data: userData, error: userErr } = await supabase.auth.getUser();
              if (userErr || !userData.user?.email) {
                throw userErr ?? new Error("No active session.");
              }
              const { error: reauthErr } = await supabase.auth.signInWithPassword({
                email: userData.user.email,
                password: values.currentPassword,
              });
              if (reauthErr) {
                toast.error("Current password is incorrect.");
                return;
              }

              const { error } = await supabase.auth.updateUser({
                password: values.password,
              });
              if (error) throw error;

              setStatus("COMPLETE");
              toast.success("Password updated.");
              await new Promise((resolve) => setTimeout(resolve, 800));
              onClose();
            } catch (err: unknown) {
              toast.error(friendlyAuthError(err, "Failed to update password."));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, errors, touched, status }) => (
            <Form className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium leading-6 text-gray-900">
                  Current Password
                </label>
                <div className="mt-2">
                  <Field
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
                {errors.currentPassword && touched.currentPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.currentPassword}</p>
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

              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && status === "PENDING" && (
                    <FontAwesomeIcon icon={faSpinner} className="text-white" spin size="xl" />
                  )}
                  {!isSubmitting && status === "PENDING" && "Update Password"}
                  {status === "COMPLETE" && (
                    <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />
                  )}
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
