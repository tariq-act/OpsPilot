import { LuCheck, LuStar } from "react-icons/lu"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

const benefits = [
  "14-day free trial",
  "No credit card required",
  "Unlimited technicians",
] as const

export function SignupPanel() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
          Built for trades. Scaled for growth.
        </h1>
        <p className="text-base leading-relaxed text-foreground-secondary">
          Join 3,000+ businesses using OpsPilot to schedule work, dispatch
          crews, and keep every job moving.
        </p>
      </div>

      <Card className="max-w-md rounded-2xl shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center gap-1 text-warning" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, index) => (
              <LuStar
                key={index}
                className="size-4 fill-current"
                aria-hidden="true"
              />
            ))}
          </div>
          <blockquote className="text-sm leading-relaxed text-foreground">
            “OpsPilot replaced three legacy systems for us. Dispatch is faster,
            invoices go out the same day, and the team finally trusts the
            schedule.”
          </blockquote>
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              MR
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Marcus Rodriguez
              </p>
              <p className="text-xs text-muted-foreground">
                Owner, Apex Electrical Services LLC
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ul className="flex max-w-md flex-col gap-3">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2.5 text-sm text-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
              <LuCheck className="size-3.5" aria-hidden="true" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  )
}
