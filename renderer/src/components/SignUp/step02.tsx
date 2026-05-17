import { Formik, Form } from "formik";
import { OtpInput } from "../OtpInput";
import * as Yup from "yup";
import { Transition } from "@headlessui/react";
import { useEffect, useState } from "react";
import Error from "../Errors";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faEnvelope } from "@fortawesome/pro-regular-svg-icons";
import { useSupabaseClient } from "@/lib/supabase-provider";

const RESEND_COOLDOWN = 60;

const SignupSchema = Yup.object().shape({
  code: Yup.string().length(8, "Code must be 8 digits").required("Required"),
});

const Spinner = (
  <FontAwesomeIcon icon={faSpinner} className="text-white" spin={true} size="xl" />
);

const Tick = (
  <FontAwesomeIcon icon={faCheck} className="text-white" size="xl" />
);

export default function Step02({ onContinue, email }) {
  const [formErrors, setFormErrors] = useState<string>();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string>();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendMessage("Email resent — check your inbox.");
      setResendCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      setFormErrors(error.message || String(error));
    }
  };

  return (
    <Formik
      initialValues={{ code: "" }}
      initialStatus={"PENDING"}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setFormErrors("");

        try {
          const { error } = await supabase.auth.verifyOtp({
            email,
            token: values.code,
            type: "signup",
          });

          if (error) throw error;

          setStatus("COMPLETE");
          await new Promise((resolve) => setTimeout(resolve, 800));
          onContinue();
        } catch (error: any) {
          setFormErrors(error.message || String(error));
        }

        setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched, status, values, setFieldValue, setFieldTouched }) => (
        <Form className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
            <FontAwesomeIcon icon={faEnvelope} className="text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-sm text-indigo-700">
              We sent an 8-digit confirmation code to{" "}
              <span className="font-semibold">{email}</span>. Enter it below to
              activate your account.
            </p>
          </div>

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
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-3">
              Confirmation code
            </label>
            <OtpInput
              length={8}
              value={values.code}
              onChange={(val) => setFieldValue("code", val)}
              onBlur={() => setFieldTouched("code", true)}
              disabled={isSubmitting}
              hasError={!!(errors.code && touched.code)}
            />
            {errors.code && touched.code && (
              <p className="mt-2 text-sm text-red-600 text-center">{errors.code}</p>
            )}
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && status === "PENDING" && Spinner}
              {!isSubmitting && status === "PENDING" && "Confirm account"}
              {status === "COMPLETE" && Tick}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            {resendMessage && !resendCooldown ? (
              <span>{resendMessage}</span>
            ) : resendCooldown > 0 ? (
              <span>Resend available in {resendCooldown}s</span>
            ) : (
              <span>
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Resend email
                </button>
              </span>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
}
