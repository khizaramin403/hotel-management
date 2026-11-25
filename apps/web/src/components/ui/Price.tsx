import { formatPrice } from "@/lib/format";

export interface PriceProps {
  amount: number;
  perNight?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PriceProps["size"]>, string> = {
  sm: "text-[22px] leading-[30px]",
  md: "text-[22px] leading-[30px] md:text-[24px] md:leading-[32px]",
  lg: "text-[24px] leading-[32px] md:text-[28px] md:leading-[36px]",
};

export function Price({ amount, perNight = false, size = "md", className = "" }: PriceProps) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-1.5 ${className}`.trim()}>
      <span className={`font-serif font-semibold tabular text-ink ${SIZE_CLASSES[size]}`}>
        {formatPrice(amount)}
      </span>
      {perNight ? (
        <span className="font-sans text-[13px] font-normal leading-[20px] text-muted">
          per night
        </span>
      ) : null}
    </span>
  );
}
