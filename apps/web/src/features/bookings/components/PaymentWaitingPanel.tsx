"use client";

import Link from "next/link";
import { Alert, Button, Skeleton } from "antd";

export interface PaymentWaitingPanelProps {
  isTimedOut: boolean;
  isPaymentFailed: boolean;
  isBookingCancelled: boolean;
  isRetryingPayment?: boolean;
  simulatingStatus: "paid" | "failed" | null;
  cancelledActionHref?: string;
  cancelledActionLabel?: string;
  onSimulate: (status: "paid" | "failed") => void;
  onRetryPayment: () => void;
  onBack?: () => void;
  showCardChrome?: boolean;
}

export function PaymentWaitingPanel({
  isTimedOut,
  isPaymentFailed,
  isBookingCancelled,
  isRetryingPayment = false,
  simulatingStatus,
  cancelledActionHref,
  cancelledActionLabel = "Choose dates on room page",
  onSimulate,
  onRetryPayment,
  onBack,
  showCardChrome = true,
}: PaymentWaitingPanelProps) {
  const showDevPayment = process.env.NEXT_PUBLIC_SHOW_DEV_PAYMENT === "true";
  const containerClass = showCardChrome
    ? "space-y-6 rounded-lg border border-line bg-neutral-0 p-6"
    : "space-y-6";

  if (isBookingCancelled) {
    return (
      <div className={containerClass}>
        <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
          Booking cancelled
        </h2>
        <Alert
          type="error"
          showIcon
          message="This booking was cancelled or expired before payment was confirmed."
          description={
            cancelledActionHref ? (
              <Link
                href={cancelledActionHref}
                className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
              >
                {cancelledActionLabel}
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (isPaymentFailed) {
    return (
      <div className={containerClass}>
        <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
          Payment
        </h2>
        <Alert
          type="error"
          showIcon
          message="Payment was declined by the payment provider."
          description="Your reservation is still pending. Try paying again."
        />
        <div
          className={`flex flex-col-reverse gap-3 pt-2 lg:flex-row lg:items-center ${
            onBack ? "lg:justify-between" : "lg:justify-end"
          }`}
        >
          {onBack ? (
            <Button
              disabled={isRetryingPayment}
              onClick={onBack}
              className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
            >
              Back
            </Button>
          ) : null}
          <Button
            type="primary"
            loading={isRetryingPayment}
            disabled={isRetryingPayment}
            onClick={onRetryPayment}
            className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
          >
            Pay now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="payment-waiting-card" className={containerClass}>
      <div className="space-y-1">
        <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
          Waiting for payment confirmation
        </h2>
        <p className="m-0 font-sans text-[14px] leading-[22px] text-muted">
          Payment is confirmed by our payment provider. Keep this page open for a moment.
        </p>
      </div>

      <div role="status" aria-busy="true" aria-label="Waiting for payment confirmation">
        <Skeleton active title={{ width: "45%" }} paragraph={{ rows: 2 }} />
      </div>

      {isTimedOut ? (
        <Alert
          type="warning"
          showIcon
          message="We are still waiting for confirmation. You can check My bookings."
          description={
            <Link
              href="/my-bookings"
              className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
            >
              My bookings
            </Link>
          }
        />
      ) : null}

      {showDevPayment ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="font-sans text-[12px] font-medium leading-[18px] text-muted">
            Dev tools:
          </span>
          <Button
            size="small"
            loading={simulatingStatus === "paid"}
            disabled={simulatingStatus !== null}
            onClick={() => onSimulate("paid")}
          >
            Simulate paid
          </Button>
          <Button
            size="small"
            loading={simulatingStatus === "failed"}
            disabled={simulatingStatus !== null}
            onClick={() => onSimulate("failed")}
          >
            Simulate failed
          </Button>
        </div>
      ) : null}
    </div>
  );
}
