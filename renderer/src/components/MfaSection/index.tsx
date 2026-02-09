"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase-provider";
import Button from "../Button";
import { toast } from "sonner";

type Factor = { id: string; friendly_name?: string; factor_type: string };

export default function MfaSection() {
  const supabase = useSupabaseClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [unenrolling, setUnenrolling] = useState<string | null>(null);

  const loadFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totpFactors = data?.all?.filter((f) => f.factor_type === "totp") ?? [];
    setFactors(totpFactors);
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, [supabase]);

  const handleEnrollStart = async () => {
    setEnrolling(true);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error) throw error;
      if (data?.totp) {
        setQrCode(data.totp.qr_code ?? null);
        setSecret(data.totp.secret ?? null);
        setFactorId(data.id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start enrollment");
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !verifyCode.trim()) return;
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode.trim(),
      });
      if (verifyError) throw verifyError;
      toast.success("Two-factor authentication is now on.");
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode("");
      await loadFactors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleUnenroll = async (f: Factor) => {
    setUnenrolling(f.id);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (error) throw error;
      toast.success("Two-factor authentication has been turned off.");
      await loadFactors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setUnenrolling(null);
    }
  };

  const cancelEnroll = () => {
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
  };

  return (
    <div className="border-b border-gray-900/10 my-6">
      <h2 className="text-base font-semibold leading-7 text-gray-900">
        Two-factor authentication
      </h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">
        Add an extra layer of security with an authenticator app.
      </p>

      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            {factors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Active factors</p>
                <ul className="space-y-2">
                  {factors.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-2 text-sm"
                    >
                      <span>{f.friendly_name ?? f.factor_type ?? f.id}</span>
                      <button
                        type="button"
                        onClick={() => handleUnenroll(f)}
                        disabled={unenrolling === f.id}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {unenrolling === f.id ? "Disabling..." : "Disable"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!factorId ? (
              factors.length === 0 && (
                <Button onClick={handleEnrollStart} disabled={enrolling}>
                  {enrolling ? "Starting..." : "Enable two-factor authentication"}
                </Button>
              )
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Scan this QR code with your authenticator app, then enter the code below.
                </p>
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR code" className="w-48 h-48" />
                  </div>
                )}
                {secret && (
                  <p className="text-xs text-gray-500 break-all font-mono">
                    Or enter this secret manually: {secret}
                  </p>
                )}
                <form onSubmit={handleEnrollVerify} className="space-y-2">
                  <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-900">
                    Verification code
                  </label>
                  <input
                    id="mfa-code"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="block w-full max-w-xs rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                  <div className="flex gap-2">
                    <Button type="submit">Verify and enable</Button>
                    <Button type="button" onClick={cancelEnroll}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
