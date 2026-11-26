"use client";

import { useState, type ReactNode } from "react";
import { ExclamationCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStaffSchema, ERROR_CODE, type CreateStaffInput } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Input, Modal, Tooltip } from "antd";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { applyServerValidationDetails } from "@/components/auth/authFormErrors";
import { createStaff, normalizeApiError } from "@/lib/api";
import { addStaffInCache } from "../lib/staffCache";

export interface StaffFormModalProps {
  onClose: () => void;
}

const STAFF_FORM_FIELDS = ["name", "email", "password"] as const;
type StaffFormFieldName = (typeof STAFF_FORM_FIELDS)[number];

const FIELD_ELEMENT_IDS: Record<StaffFormFieldName, string> = {
  name: "staff-form-name",
  email: "staff-form-email",
  password: "staff-form-password",
};

function scrollToFirstFieldError(errors: FieldErrors<CreateStaffInput>): void {
  const firstInvalid = STAFF_FORM_FIELDS.find((fieldName) => Boolean(errors[fieldName]));
  if (!firstInvalid || typeof document === "undefined") {
    return;
  }

  const element = document.getElementById(FIELD_ELEMENT_IDS[firstInvalid]);
  if (!element) {
    return;
  }

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  element.focus();
}

function FieldError({ id, message }: { id: string; message?: string }): ReactNode {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
    >
      <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function StaffFormModal({ onClose }: StaffFormModalProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose();
  };

  const handleValidSubmit = async (values: CreateStaffInput) => {
    try {
      const created = await createStaff(values);
      addStaffInCache(queryClient, created);
      message?.success?.({
        content: `${created.name} added to staff.`,
        duration: 3,
      });
      onClose();
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);

      if (apiError.status === 409 || apiError.code === ERROR_CODE.EMAIL_TAKEN) {
        setError("email", {
          type: "server",
          message: apiError.message || "An account with this email already exists.",
        });
        document.getElementById(FIELD_ELEMENT_IDS.email)?.focus();
        return;
      }

      if (apiError.status === 422 && apiError.details && apiError.details.length > 0) {
        const applied = applyServerValidationDetails(apiError.details, STAFF_FORM_FIELDS, setError);
        if (applied) {
          return;
        }
      }

      message?.error?.({
        content:
          apiError.message || "Could not add staff account. Check your connection and try again.",
        duration: 5,
      });
    }
  };

  const handleInvalidSubmit = (fieldErrors: FieldErrors<CreateStaffInput>) => {
    scrollToFirstFieldError(fieldErrors);
  };

  const passwordDescribedBy = [
    errors.password ? "staff-form-password-error" : undefined,
    "staff-form-password-helper",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      open
      width={520}
      className="staff-form-modal !max-w-[calc(100vw-32px)]"
      onCancel={handleClose}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      footer={null}
      destroyOnHidden
      title={
        <span className="font-serif text-[22px] font-medium leading-[30px] text-ink">
          Add staff
        </span>
      }
    >
      <form
        onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
        noValidate
        className="space-y-4 pt-2"
      >
        <div>
          <label
            htmlFor={FIELD_ELEMENT_IDS.name}
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Name
          </label>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                id={FIELD_ELEMENT_IDS.name}
                name={field.name}
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Bilal Ahmed"
                autoComplete="name"
                maxLength={60}
                autoFocus
                status={errors.name ? "error" : undefined}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "staff-form-name-error" : undefined}
                className="font-sans !text-[16px] md:!text-[14px]"
              />
            )}
          />
          <FieldError id="staff-form-name-error" message={errors.name?.message} />
        </div>

        <div>
          <label
            htmlFor={FIELD_ELEMENT_IDS.email}
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Email
          </label>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                id={FIELD_ELEMENT_IDS.email}
                name={field.name}
                ref={field.ref}
                type="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="bilal@hotel.example"
                autoComplete="email"
                status={errors.email ? "error" : undefined}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "staff-form-email-error" : undefined}
                className="font-sans !text-[16px] md:!text-[14px]"
              />
            )}
          />
          <FieldError id="staff-form-email-error" message={errors.email?.message} />
        </div>

        <div>
          <label
            htmlFor={FIELD_ELEMENT_IDS.password}
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Password
          </label>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                id={FIELD_ELEMENT_IDS.password}
                name={field.name}
                ref={field.ref}
                type={showPassword ? "text" : "password"}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Create a password"
                autoComplete="new-password"
                status={errors.password ? "error" : undefined}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={passwordDescribedBy}
                className="font-sans !text-[16px] md:!text-[14px]"
                suffix={
                  <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="-my-2 -mr-1 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded border-0 bg-transparent p-1 text-muted transition-colors hover:text-ink md:my-0 md:mr-0 md:min-h-[32px] md:min-w-[32px]"
                    >
                      {showPassword ? (
                        <EyeInvisibleOutlined className="text-[16px]" aria-hidden="true" />
                      ) : (
                        <EyeOutlined className="text-[16px]" aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip>
                }
              />
            )}
          />
          <p
            id="staff-form-password-helper"
            className="mt-1.5 mb-0 font-sans text-[13px] leading-[20px] text-muted"
          >
            At least 8 characters with a letter and a number.
          </p>
          <FieldError id="staff-form-password-error" message={errors.password?.message} />
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            disabled={isSubmitting}
            onClick={handleClose}
            className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
