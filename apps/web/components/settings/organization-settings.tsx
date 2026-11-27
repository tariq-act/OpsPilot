"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ConfirmAction,
  Feedback,
  ManagerSettings,
  SettingsCard,
} from "./settings-shell";
import { useUpdateOrganizationMutation } from "@/lib/query/organizations";
import { toUserErrorMessage } from "@/lib/query/errors";
import type { OrganizationSettingsInput } from "@/lib/api/organizations";
import type { OrganizationListItem } from "@/lib/types";

export function OrganizationSettings({
  preferences = false,
}: {
  preferences?: boolean;
}) {
  return (
    <ManagerSettings>
      {(org) => (
        <OrganizationForm key={org.id} org={org} preferences={preferences} />
      )}
    </ManagerSettings>
  );
}

function OrganizationForm({
  org,
  preferences,
}: {
  org: OrganizationListItem;
  preferences: boolean;
}) {
  const mutation = useUpdateOrganizationMutation(org.id);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<OrganizationSettingsInput | null>(null);

  async function save(input: OrganizationSettingsInput) {
    setError(null);
    setSuccess(null);
    try {
      await mutation.mutateAsync(input);
      setSuccess("Organization settings saved.");
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to save settings."));
    } finally {
      setConfirmation(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    if (preferences) {
      const timezone = value("timezone");
      const currency = value("currency").toUpperCase();
      try {
        new Intl.DateTimeFormat("en", { timeZone: timezone });
      } catch {
        setError("Enter a valid IANA timezone, such as America/Toronto.");
        return;
      }
      if (!Intl.supportedValuesOf("currency").includes(currency)) {
        setError("Enter a supported three-letter currency code.");
        return;
      }
      const input = { timezone, currency };
      if (currency !== org.currency) setConfirmation(input);
      else void save(input);
    } else {
      const name = value("name");
      if (!name) {
        setError("Business name is required.");
        return;
      }
      const logo = value("logo");
      if (logo && !logo.startsWith("https://")) {
        setError("Logo must use an HTTPS URL.");
        return;
      }
      void save({
        name,
        slug: value("slug"),
        logo: logo || null,
        email: value("email") || null,
        phone: value("phone") || null,
        address: value("address") || null,
      });
    }
  }

  return (
    <SettingsCard
      title={preferences ? "Business Preferences" : "General"}
      description={
        preferences
          ? "Set your organization's timezone and default invoice currency."
          : "Update your business identity and contact information."
      }
    >
      <form onSubmit={submit} className="max-w-2xl space-y-5">
        <fieldset
          disabled={mutation.isPending}
          className="grid gap-4 sm:grid-cols-2"
        >
          {preferences ? (
            <>
              <Field
                label="Timezone"
                name="timezone"
                defaultValue={org.timezone}
                required
                maxLength={64}
                list="timezones"
              />
              <datalist id="timezones">
                {["UTC", ...Intl.supportedValuesOf("timeZone")].map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
              <Field
                label="Default currency"
                name="currency"
                defaultValue={org.currency}
                required
                maxLength={3}
                list="currencies"
              />
              <datalist id="currencies">
                {Intl.supportedValuesOf("currency").map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Timezone controls local scheduling and display. Currency can
                only be changed before the first invoice is created to keep
                financial reports consistent.
              </p>
            </>
          ) : (
            <>
              <Field
                label="Business name"
                name="name"
                defaultValue={org.name}
                required
                maxLength={100}
              />
              <Field
                label="Organization slug"
                name="slug"
                defaultValue={org.slug}
                required
                minLength={2}
                maxLength={63}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
              <Field
                label="Business email"
                name="email"
                type="email"
                defaultValue={org.email ?? ""}
                maxLength={255}
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                defaultValue={org.phone ?? ""}
                maxLength={32}
              />
              <Field
                label="Logo URL (HTTPS)"
                name="logo"
                type="url"
                defaultValue={org.logo ?? ""}
                maxLength={2048}
              />
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  defaultValue={org.address ?? ""}
                  maxLength={500}
                />
              </div>
            </>
          )}
        </fieldset>
        <Feedback error={error} success={success} />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
      {confirmation && (
        <ConfirmAction
          title="Change default currency?"
          description="New invoices will use the new currency. This change is only allowed before any invoices exist."
          pending={mutation.isPending}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void save(confirmation)}
        />
      )}
    </SettingsCard>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
