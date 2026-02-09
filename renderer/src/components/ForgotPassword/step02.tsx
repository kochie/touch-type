"use client";

import Button from "../Button";

export function Step02({ email, onSignIn, onClose }) {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-green-800">Check your email</h3>
        <p className="mt-1 text-sm text-green-700">
          We sent a password reset link to <strong>{email}</strong>. Open the link in your browser to set a new password, then sign in here.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSignIn}>Sign In</Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
