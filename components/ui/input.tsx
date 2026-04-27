import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  return (
    <div className="mc-field">
      {label ? (
        <label className="mc-label" htmlFor={id}>
          {label}
        </label>
      ) : null}

      <input
        id={id}
        className={joinClasses(
          "mc-input",
          error && "mc-input-error",
          className,
        )}
        {...props}
      />

      {error ? <p className="mc-error-text">{error}</p> : null}
    </div>
  );
}
