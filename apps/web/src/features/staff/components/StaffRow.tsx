"use client";

import { memo } from "react";
import type { User } from "@hotel/shared";
import { Button, Popconfirm } from "antd";
import { formatDate } from "@/lib/format";

export interface StaffRowProps {
  staff: User;
  isDeleting: boolean;
  onDelete: (staff: User) => Promise<void> | void;
}

export function formatStaffCreatedDate(createdAt?: string): string {
  if (!createdAt) {
    return "—";
  }
  try {
    return formatDate(createdAt);
  } catch {
    return "—";
  }
}

export const StaffRow = memo(function StaffRow({ staff, isDeleting, onDelete }: StaffRowProps) {
  return (
    <article
      data-testid={`staff-card-${staff.id}`}
      className="rounded-lg border border-line bg-neutral-0 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h4 className="m-0 truncate font-sans text-[15px] font-semibold leading-[22px] text-ink">
            {staff.name}
          </h4>
          <p className="m-0 truncate font-sans text-[14px] leading-[22px] text-muted">
            {staff.email}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-sans text-[13px] leading-[20px] tabular text-muted">
          Created {formatStaffCreatedDate(staff.createdAt)}
        </span>

        <Popconfirm
          title="Delete staff account?"
          description="This account will lose dashboard access."
          okText="Delete"
          cancelText="Keep"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(staff)}
        >
          <Button
            type="text"
            danger
            size="small"
            loading={isDeleting}
            disabled={isDeleting}
            className="min-h-[44px]"
          >
            Delete
          </Button>
        </Popconfirm>
      </div>
    </article>
  );
});
