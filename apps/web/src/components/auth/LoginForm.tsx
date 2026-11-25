"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@hotel/shared";
import { Alert, Button } from "antd";
import { useForm } from "react-hook-form";
import { normalizeApiError } from "@/lib/api/errors";
import { login } from "@/lib/api/endpoints/auth";
import { resolvePostLoginRedirect } from "@/lib/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser } from "@/store/slices/authSlice";
import { AuthFormField } from "./AuthFormField";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { applyServerValidationDetails } from "./authFormErrors";

const LOGIN_FIELDS = ["email", "password"] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [formError, setFormError] = useState<string | null>(null);

  const nextParam = searchParams.get("next");
  const isRegistered = searchParams.get("registered") === "1";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);

    try {
      const user = await login(values);
      dispatch(setAuthUser(user));
      const destination = resolvePostLoginRedirect(user.role, nextParam);
      router.replace(destination);
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);

      if (apiError.status === 401 || apiError.code === "UNAUTHENTICATED") {
        setFormError("Email or password is incorrect.");
        return;
      }

      if (apiError.status === 422 && apiError.details && apiError.details.length > 0) {
        const applied = applyServerValidationDetails(apiError.details, LOGIN_FIELDS, setError);
        if (!applied) {
          setFormError(apiError.message);
        }
        return;
      }

      setFormError(apiError.message);
    }
  };

  const registerHref = nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register";

  return (
    <AuthSplitLayout
      panelTitle="Welcome back"
      panelSubtitle="Manage your stay in a few taps."
      formTitle="Log in"
      formSubtitle="Use your email and password."
    >
      {isRegistered ? (
        <Alert
          type="success"
          showIcon
          message="Account created. Sign in to continue."
          className="mb-4 w-full"
        />
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthFormField
          control={control}
          name="email"
          id="login-email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          helperText="Enter the email registered with your account."
          errorMessage={errors.email?.message}
        />

        <AuthFormField
          control={control}
          name="password"
          id="login-password"
          label="Password"
          type="password"
          placeholder="Enter password"
          autoComplete="current-password"
          helperText="Passwords are case-sensitive."
          errorMessage={errors.password?.message}
        />

        {formError ? <Alert type="error" showIcon message={formError} className="w-full" /> : null}

        <div className="pt-2">
          <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
            Log in
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-center gap-1.5 font-sans text-[14px] leading-[22px] text-muted">
        <span>New here?</span>
        <Link
          href={registerHref}
          className="font-medium text-green-600 no-underline hover:underline"
        >
          Create an account
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
