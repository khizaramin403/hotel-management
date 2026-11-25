"use client";

import type { ReactNode } from "react";
import { Alert, Button, Result } from "antd";

export interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  variant?: "result" | "alert";
  status?: "error" | "403" | "404" | "500";
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  action,
  variant = "result",
  status = "error",
  className = "",
}: ErrorStateProps) {
  if (variant === "alert") {
    const alertAction =
      onRetry || action ? (
        <div className="flex flex-wrap items-center gap-2">
          {onRetry ? (
            <Button size="small" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : undefined;

    return (
      <div className={className}>
        <Alert
          type="error"
          showIcon
          message={title}
          description={description}
          action={alertAction}
        />
      </div>
    );
  }

  const extra =
    onRetry || action ? (
      <div className="flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {action}
        {onRetry ? (
          <Button type="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    ) : undefined;

  return (
    <div className={className}>
      <Result status={status} title={title} subTitle={description} extra={extra} />
    </div>
  );
}
