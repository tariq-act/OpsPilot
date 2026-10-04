import type { Metadata } from "next"

import { BrandMark } from "@/components/auth/brand-mark"
import { SignupForm } from "@/components/auth/signup-form"
import { SignupPanel } from "@/components/auth/signup-panel"

export const metadata: Metadata = {
  title: "Sign up",
}

export default function SignupPage() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-background-subtle px-10 py-8 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%)]"
        />
        <BrandMark className="relative" />
        <div className="relative flex flex-1 flex-col justify-center py-12">
          <SignupPanel />
        </div>
        <div className="relative h-4" aria-hidden="true" />
      </aside>

      <div className="flex min-h-svh flex-col">
        <div className="flex items-center justify-between px-6 py-6 lg:hidden">
          <BrandMark />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <SignupForm />
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 pb-8 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-foreground">
            Terms of Service
          </a>
          <a href="#" className="hover:text-foreground">
            System Status
          </a>
        </footer>
      </div>
    </div>
  )
}
