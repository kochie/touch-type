interface ButtonProps {
  onClick?: () => void;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function Button({
  onClick,
  children,
  type,
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      className="disabled:saturate-50 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm bg-gradient-to-r button-gradient focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-600 transition-all transform-gpu duration-500 bg-pos-0 active:bg-pos-50 hover:bg-pos-100 bg-size-300"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
