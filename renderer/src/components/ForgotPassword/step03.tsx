import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";

export default function Step03({ onSignIn, onClose }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <FontAwesomeIcon icon={faCheckCircle} className="w-12 h-12 text-green-500" />
      <div>
        <p className="text-base font-semibold text-gray-900">Password reset successfully</p>
        <p className="mt-1 text-sm text-gray-500">Sign in with your new password to continue.</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={onSignIn}>Sign In</Button>
        <button
          onClick={onClose}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2"
        >
          Done
        </button>
      </div>
    </div>
  );
}
