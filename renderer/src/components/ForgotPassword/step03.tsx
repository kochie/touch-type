import Button from "../Button";

export default function Step03({ onSignIn, onClose }) {
  return (
    <div>
      <p>Thanks, your account has been reset, please sign in here</p>
      <Button onClick={onSignIn}>Sign In</Button>
      <Button onClick={onClose}>Nice</Button>
    </div>
  );
}
