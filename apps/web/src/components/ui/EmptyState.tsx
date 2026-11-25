"use client";

import type { ReactNode } from "react";
import { InboxOutlined } from "@ant-design/icons";
import { Empty } from "antd";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div className={`py-8 text-center ${className}`.trim()}>
      <Empty
        image={icon ?? <InboxOutlined className="text-[48px] text-muted" aria-hidden="true" />}
        description={
          <div className="mx-auto max-w-md space-y-1">
            <div className="font-sans text-[18px] font-semibold leading-[26px] text-ink">
              {title}
            </div>
            {description ? (
              <div className="font-sans text-[14px] leading-[22px] text-muted">{description}</div>
            ) : null}
          </div>
        }
      >
        {action}
      </Empty>
    </div>
  );
}
