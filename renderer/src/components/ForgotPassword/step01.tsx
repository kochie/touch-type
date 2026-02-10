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

export function Step01({ onContinue }) {
  const [formErrors, setFormErrors] = useState<string>();
  const supabase = useSupabaseClient();

  return (
    <Formik
      initialValues={{
        email: "",
      }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setFormErrors("");

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(
            values.email,
            {
              redirectTo: process.env.NEXT_PUBLIC_RESET_PASSWORD_URL!,
            }
          );

          if (error) {
            throw error;
          }

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
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && "Send Reset Email"}
              {!isSubmitting && status === "COMPLETE" && Tick}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
