'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { saveProfile } from '@/lib/account/actions';
import type { ActionResult } from '@/types/commerce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Alert } from '@/components/ui/primitives';
import { AlertIcon, CheckIcon } from '@/components/ui/icons';

export function ProfileForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const [result, setResult] = React.useState<ActionResult | null>(null);

  const onSubmit = async (formData: FormData) => {
    setResult(await saveProfile(formData));
  };

  return (
    <form action={onSubmit} className="space-y-5 rounded-lg border border-line bg-surface p-5">
      {result?.ok && (
        <Alert tone="success" icon={<CheckIcon size={18} />}>
          Your details were saved.
        </Alert>
      )}
      {result && !result.ok && (
        <Alert tone="danger" icon={<AlertIcon size={18} />}>
          {result.error}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="firstName"
          name="firstName"
          label="First name"
          defaultValue={firstName}
          autoComplete="given-name"
          required
          error={result && !result.ok ? result.fieldErrors?.firstName : undefined}
        />
        <Input
          id="lastName"
          name="lastName"
          label="Last name"
          defaultValue={lastName}
          autoComplete="family-name"
          required
          error={result && !result.ok ? result.fieldErrors?.lastName : undefined}
        />
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  // useFormStatus must be read from inside the form it belongs to.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save changes
    </Button>
  );
}
