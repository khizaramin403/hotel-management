"use client";

import { useState } from "react";
import { ExclamationCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Input, Tooltip } from "antd";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

export interface AuthFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  helperText?: string;
  errorMessage?: string;
}

export function AuthFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  helperText,
  errorMessage,
}: AuthFormFieldProps<TFieldValues, TName>) {
  const [showPassword, setShowPassword] = useState(false);

  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;
  const inputType = type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
      >
        {label}
      </label>

      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={id}
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            size="large"
            type={inputType}
            placeholder={placeholder}
            autoComplete={autoComplete}
            status={errorMessage ? "error" : undefined}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={describedBy}
            className="font-sans !text-[16px] md:!text-[14px]"
            suffix={
              type === "password" ? (
                <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="inline-flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center rounded border-0 bg-transparent p-1 text-muted transition-colors hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeInvisibleOutlined className="text-[16px]" aria-hidden="true" />
                    ) : (
                      <EyeOutlined className="text-[16px]" aria-hidden="true" />
                    )}
                  </button>
                </Tooltip>
              ) : undefined
            }
          />
        )}
      />

      {helperText ? (
        <p id={helperId} className="mt-1.5 mb-0 font-sans text-[13px] leading-[20px] text-muted">
          {helperText}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
        >
          <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      ) : null}
    </div>
  );
}
