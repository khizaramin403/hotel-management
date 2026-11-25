import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  variant?: "h1" | "h3";
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  variant = "h1",
  className = "",
}: PageHeaderProps) {
  const headingClass =
    variant === "h1"
      ? "m-0 font-serif text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-ink md:text-[36px] md:leading-[44px]"
      : "m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]";

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <div>
        {variant === "h1" ? (
          <h1 className={headingClass}>{title}</h1>
        ) : (
          <h3 className={headingClass}>{title}</h3>
        )}
        {subtitle ? (
          <p className="mt-1 mb-0 max-w-[65ch] font-sans text-[14px] leading-[22px] text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
