"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import type { CustomerAddress, ActionResult } from "@/types/commerce";
import { removeAddress, saveAddress } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Drawer } from "@/components/ui/drawer";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import {
  AlertIcon,
  CheckIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";

/**
 * Address book.
 *
 * Add/edit happens in a drawer so the customer keeps their list in view.
 * Deletion asks for confirmation inline rather than through a browser
 * `confirm()`, which is unstyled, unlocalized and easy to mis-tap on mobile.
 */
export function AddressManager({
  addresses,
  defaultAddressId,
}: {
  addresses: CustomerAddress[];
  defaultAddressId: string | null;
}) {
  const [editing, setEditing] = React.useState<CustomerAddress | "new" | null>(
    null,
  );
  const [confirmingDelete, setConfirmingDelete] = React.useState<string | null>(
    null,
  );
  const [notice, setNotice] = React.useState<string | null>(null);

  return (
    <>
      {notice && (
        <Alert tone="success" icon={<CheckIcon size={18} />}>
          {notice}
        </Alert>
      )}

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPinIcon size={24} />}
          title="No addresses saved"
          description="Save an address now and checkout will be a step shorter next time."
          action={
            <Button onClick={() => setEditing("new")}>Add an address</Button>
          }
          className="rounded-lg border border-line bg-surface"
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setEditing("new")} variant="outline">
              <PlusIcon size={17} />
              Add address
            </Button>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => {
              const isDefault = address.id === defaultAddressId;
              return (
                <li
                  key={address.id}
                  className="flex flex-col rounded-lg border border-line bg-surface p-5"
                >
                  {isDefault && (
                    <Badge tone="accent" className="mb-3 self-start">
                      Default
                    </Badge>
                  )}

                  <address className="flex-1 space-y-0.5 text-sm not-italic text-ink-muted">
                    {address.formatted.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>

                  {confirmingDelete === address.id ? (
                    <div className="mt-4 rounded-md bg-danger-soft p-3">
                      <p className="text-sm font-medium text-danger">
                        Delete this address?
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <form
                          action={async (formData: FormData) => {
                            const result = await removeAddress(formData);
                            setConfirmingDelete(null);
                            if (result.ok) setNotice("Address deleted.");
                          }}
                        >
                          <input
                            type="hidden"
                            name="addressId"
                            value={address.id}
                          />
                          <Button type="submit" variant="danger" size="sm">
                            Delete
                          </Button>
                        </form>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingDelete(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(address)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(address.id)}
                        aria-label="Delete this address"
                      >
                        <TrashIcon size={16} />
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        side="right"
        title={editing === "new" ? "Add address" : "Edit address"}
      >
        {editing !== null && (
          <AddressForm
            address={editing === "new" ? null : editing}
            isDefault={editing !== "new" && editing.id === defaultAddressId}
            onSaved={() => {
              setEditing(null);
              setNotice(
                editing === "new" ? "Address added." : "Address updated.",
              );
            }}
          />
        )}
      </Drawer>
    </>
  );
}

function AddressForm({
  address,
  isDefault,
  onSaved,
}: {
  address: CustomerAddress | null;
  isDefault: boolean;
  onSaved: () => void;
}) {
  const [result, setResult] = React.useState<ActionResult | null>(null);

  const onSubmit = async (formData: FormData) => {
    const outcome = await saveAddress(formData);
    setResult(outcome);
    if (outcome.ok) onSaved();
  };

  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};

  return (
    <form action={onSubmit} className="space-y-4 px-5 py-5">
      {result && !result.ok && (
        <Alert tone="danger" icon={<AlertIcon size={18} />}>
          {result.error}
        </Alert>
      )}

      {address && <input type="hidden" name="addressId" value={address.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="firstName"
          name="firstName"
          label="First name"
          defaultValue={address?.firstName ?? ""}
          autoComplete="given-name"
          required
          error={errors.firstName}
        />
        <Input
          id="lastName"
          name="lastName"
          label="Last name"
          defaultValue={address?.lastName ?? ""}
          autoComplete="family-name"
          required
          error={errors.lastName}
        />
      </div>

      <Input
        id="company"
        name="company"
        label="Company"
        hint="Optional"
        defaultValue={address?.company ?? ""}
        autoComplete="organization"
        error={errors.company}
      />

      <Input
        id="address1"
        name="address1"
        label="Address"
        defaultValue={address?.address1 ?? ""}
        autoComplete="address-line1"
        required
        error={errors.address1}
      />

      <Input
        id="address2"
        name="address2"
        label="Apartment, suite, etc."
        hint="Optional"
        defaultValue={address?.address2 ?? ""}
        autoComplete="address-line2"
        error={errors.address2}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="city"
          name="city"
          label="City"
          defaultValue={address?.city ?? ""}
          autoComplete="address-level2"
          required
          error={errors.city}
        />
        <Input
          id="zoneCode"
          name="zoneCode"
          label="State / province"
          hint="Code, e.g. CA"
          defaultValue={address?.zoneCode ?? ""}
          autoComplete="address-level1"
          error={errors.zoneCode}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="zip"
          name="zip"
          label="Postcode"
          defaultValue={address?.zip ?? ""}
          autoComplete="postal-code"
          required
          error={errors.zip}
        />
        <Input
          id="territoryCode"
          name="territoryCode"
          label="Country"
          hint="2-letter code, e.g. US"
          defaultValue={address?.territoryCode ?? ""}
          autoComplete="country"
          maxLength={2}
          required
          error={errors.territoryCode}
        />
      </div>

      <Input
        id="phoneNumber"
        name="phoneNumber"
        label="Phone"
        hint="Optional. Used by the carrier for delivery updates."
        type="tel"
        defaultValue={address?.phoneNumber ?? ""}
        autoComplete="tel"
        error={errors.phoneNumber}
      />

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="makeDefault"
          value="true"
          defaultChecked={isDefault}
          className="size-4.5 rounded-xs accent-ink"
        />
        Use as my default address
      </label>

      <SubmitButton isEdit={Boolean(address)} />
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth size="lg" loading={pending}>
      {isEdit ? "Save changes" : "Add address"}
    </Button>
  );
}
