import type { HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: DivProps) {
  return <div className={joinClasses("mc-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: DivProps) {
  return (
    <div className={joinClasses("mc-card-header", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: DivProps) {
  return <h3 className={joinClasses("mc-card-title", className)} {...props} />;
}

export function CardDescription({ className, ...props }: DivProps) {
  return (
    <p className={joinClasses("mc-card-description", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: DivProps) {
  return (
    <div className={joinClasses("mc-card-content", className)} {...props} />
  );
}
