"use client";

import { useEffect } from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { guestDetailsSchema, type GuestDetailsInput } from "@hotel/shared";
import { Button, Input } from "antd";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import type { BookingGuestDetails } from "@/store/slices/bookingDraftSlice";

export interface BookingGuestDetailsFormProps {
  initialDetails: BookingGuestDetails;
  prefillName?: string;
  prefillEmail?: string;
  onSyncDraft: (details: Partial<BookingGuestDetails>) => void;
  onBack: (details: BookingGuestDetails) => void;
  onContinue: (details: BookingGuestDetails) => void;
}

const FIELD_ORDER: readonly (keyof GuestDetailsInput)[] = [
  "fullName",
  "phone",
  "email",
  "specialRequests",
];

const FIELD_ELEMENT_IDS: Record<keyof GuestDetailsInput, string> = {
  fullName: "guest-full-name",
  phone: "guest-phone",
  email: "guest-email",
  specialRequests: "guest-special-requests",
};

function scrollToFirstFieldError(errors: FieldErrors<GuestDetailsInput>): void {
  const firstInvalidField = FIELD_ORDER.find((fieldName) => Boolean(errors[fieldName]));
  if (!firstInvalidField || typeof document === "undefined") {
    return;
  }

  const element = document.getElementById(FIELD_ELEMENT_IDS[firstInvalidField]);
  if (!element) {
    return;
  }

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  element.focus();
}

export function BookingGuestDetailsForm({
  initialDetails,
  prefillName = "",
  prefillEmail = "",
  onSyncDraft,
  onBack,
  onContinue,
}: BookingGuestDetailsFormProps) {
  const {
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<GuestDetailsInput>({
    resolver: zodResolver(guestDetailsSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: initialDetails.fullName || prefillName,
      phone: initialDetails.phone,
      email: initialDetails.email || prefillEmail,
      specialRequests: initialDetails.specialRequests,
    },
  });

  useEffect(() => {
    if (prefillName && !dirtyFields.fullName && !getValues("fullName")) {
      setValue("fullName", prefillName);
    }
  }, [dirtyFields.fullName, getValues, prefillName, setValue]);

  useEffect(() => {
    if (prefillEmail && !dirtyFields.email && !getValues("email")) {
      setValue("email", prefillEmail);
    }
  }, [dirtyFields.email, getValues, prefillEmail, setValue]);

  const handleValidSubmit = (values: GuestDetailsInput) => {
    onContinue(values);
  };

  const handleInvalidSubmit = (fieldErrors: FieldErrors<GuestDetailsInput>) => {
    scrollToFirstFieldError(fieldErrors);
  };

  return (
    <div className="rounded-lg border border-line bg-neutral-0 p-6">
      <h2 className="m-0 mb-6 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
        Guest details
      </h2>

      <form
        onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
        noValidate
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label
              htmlFor={FIELD_ELEMENT_IDS.fullName}
              className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
            >
              Full name
            </label>
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <Input
                  id={FIELD_ELEMENT_IDS.fullName}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    onSyncDraft({ fullName: field.value });
                  }}
                  placeholder="Sara Khan"
                  autoComplete="name"
                  status={errors.fullName ? "error" : undefined}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "guest-full-name-error" : undefined}
                  className="font-sans !text-[16px] md:!text-[14px]"
                />
              )}
            />
            {errors.fullName?.message ? (
              <p
                id="guest-full-name-error"
                role="alert"
                className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
              >
                <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
                <span>{errors.fullName.message}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={FIELD_ELEMENT_IDS.phone}
              className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
            >
              Phone
            </label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  id={FIELD_ELEMENT_IDS.phone}
                  name={field.name}
                  ref={field.ref}
                  type="tel"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    onSyncDraft({ phone: field.value });
                  }}
                  placeholder="+92 300 0000000"
                  autoComplete="tel"
                  status={errors.phone ? "error" : undefined}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "guest-phone-error" : undefined}
                  className="font-sans !text-[16px] md:!text-[14px]"
                />
              )}
            />
            {errors.phone?.message ? (
              <p
                id="guest-phone-error"
                role="alert"
                className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
              >
                <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
                <span>{errors.phone.message}</span>
              </p>
            ) : null}
          </div>
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
                onBlur={() => {
                  field.onBlur();
                  onSyncDraft({ email: field.value });
                }}
                placeholder="sara@example.com"
                autoComplete="email"
                status={errors.email ? "error" : undefined}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "guest-email-error" : undefined}
                className="font-sans !text-[16px] md:!text-[14px]"
              />
            )}
          />
          {errors.email?.message ? (
            <p
              id="guest-email-error"
              role="alert"
              className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
            >
              <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
              <span>{errors.email.message}</span>
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={FIELD_ELEMENT_IDS.specialRequests}
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Special requests (optional)
          </label>
          <Controller
            control={control}
            name="specialRequests"
            render={({ field }) => (
              <Input.TextArea
                id={FIELD_ELEMENT_IDS.specialRequests}
                name={field.name}
                ref={field.ref}
                rows={4}
                value={field.value}
                onChange={field.onChange}
                onBlur={() => {
                  field.onBlur();
                  onSyncDraft({ specialRequests: field.value });
                }}
                placeholder="Let reception know if you need an early check-in or extra pillows"
                status={errors.specialRequests ? "error" : undefined}
                aria-invalid={Boolean(errors.specialRequests)}
                aria-describedby={
                  errors.specialRequests ? "guest-special-requests-error" : undefined
                }
                className="min-h-[96px] !resize-y font-sans !text-[16px] md:!text-[14px]"
              />
            )}
          />
          {errors.specialRequests?.message ? (
            <p
              id="guest-special-requests-error"
              role="alert"
              className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
            >
              <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
              <span>{errors.specialRequests.message}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between">
          <Button
            onClick={() => onBack(getValues())}
            className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
          >
            Back
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
