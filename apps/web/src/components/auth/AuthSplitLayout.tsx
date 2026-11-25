"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { RoomImage } from "@/components/ui";

export interface AuthSplitLayoutProps {
  panelTitle: string;
  panelSubtitle: string;
  formTitle: string;
  formSubtitle: string;
  children: ReactNode;
}

export function AuthSplitLayout({
  panelTitle,
  panelSubtitle,
  formTitle,
  formSubtitle,
  children,
}: AuthSplitLayoutProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <aside className="hidden bg-green-800 p-8 text-neutral-0 md:flex md:flex-col md:justify-between lg:p-12">
        <Link
          href="/"
          className="w-fit font-serif text-[22px] font-semibold leading-[28px] tracking-[-0.01em] text-neutral-0 no-underline"
        >
          Grand Hotel
        </Link>

        <div className="relative my-8 overflow-hidden rounded-lg">
          <RoomImage
            src="/images/login.webp"
            alt="Grand Hotel courtyard and reception"
            width={560}
            height={350}
            sizes="(min-width: 768px) 45vw, 100vw"
            priority
            className="aspect-[16/10] w-full rounded-lg"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg bg-green-800/35"
          />
        </div>

        <div>
          <h1 className="m-0 font-serif text-[36px] font-semibold leading-[44px] tracking-[-0.01em] text-neutral-0">
            {panelTitle}
          </h1>
          <p className="mt-2 mb-0 max-w-[65ch] font-sans text-[16px] leading-[26px] text-green-100">
            {panelSubtitle}
          </p>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-neutral-0 p-6 md:p-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 md:hidden">
            <Link
              href="/"
              className="inline-block font-serif text-[22px] font-semibold leading-[28px] tracking-[-0.01em] text-ink no-underline"
            >
              Grand Hotel
            </Link>
          </div>

          <h2 className="m-0 font-serif text-[28px] font-semibold leading-[36px] text-ink">
            {formTitle}
          </h2>
          <p className="mt-1 mb-6 font-sans text-[14px] leading-[22px] text-muted">
            {formSubtitle}
          </p>

          {children}
        </div>
      </section>
    </main>
  );
}
