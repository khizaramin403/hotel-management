"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@hotel/shared";
import { Alert, App, Button } from "antd";
import { useForm } from "react-hook-form";
import { register as registerAccount } from "@/lib/api/endpoints/auth";
import { normalizeApiError } from "@/lib/api/errors";
import { AuthFormField } from "./AuthFormField";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { applyServerValidationDetails } from "./authFormErrors";

const REGISTER_FIELDS = ["name", "email", "password"] as const;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [formError, setFormError] = useState<string | null>(null);

  const nextParam = searchParams.get("next");

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);

    try {
      await registerAccount(values);
      message?.success?.("Account created. Please sign in.");
      const loginQuery = new URLSearchParams({ registered: "1" });
      if (nextParam) {
        loginQuery.set("next", nextParam);
      }
      router.push(`/login?${loginQuery.toString()}`);
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);

      if (apiError.status === 409 || apiError.code === "EMAIL_TAKEN") {
        setError("email", {
          type: "server",
          message: apiError.message || "An account with this email already exists.",
        });
        return;
      }

      if (apiError.status === 422 && apiError.details && apiError.details.length > 0) {
        const applied = applyServerValidationDetails(apiError.details, REGISTER_FIELDS, setError);
        if (!applied) {
          setFormError(apiError.message);
        }
        return;
      }

      setFormError(apiError.message);
    }
  };

  const loginHref = nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login";

  return (
    <AuthSplitLayout
      panelTitle="Join Grand Hotel"
      panelSubtitle="Book rooms and manage your reservations in one place."
      formTitle="Create account"
      formSubtitle="Fill in your details to register."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthFormField
          control={control}
          name="name"
          id="register-name"
          label="Full name"
          type="text"
          placeholder="Sara Khan"
          autoComplete="name"
          helperText="Between 2 and 60 characters."
          errorMessage={errors.name?.message}
        />

        <AuthFormField
          control={control}
          name="email"
          id="register-email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          helperText="We send booking confirmations to this address."
          errorMessage={errors.email?.message}
        />

        <AuthFormField
          control={control}
          name="password"
          id="register-password"
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          helperText="At least 8 characters with a letter and a number."
          errorMessage={errors.password?.message}
        />

        {formError ? <Alert type="error" showIcon message={formError} className="w-full" /> : null}

        <div className="pt-2">
          <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
            Create account
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-center gap-1.5 font-sans text-[14px] leading-[22px] text-muted">
        <span>Already have an account?</span>
        <Link href={loginHref} className="font-medium text-green-600 no-underline hover:underline">
          Log in
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
