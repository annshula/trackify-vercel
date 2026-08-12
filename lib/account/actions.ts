'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/types/commerce';
import {
  CustomerServiceError,
  createAddress,
  deleteAddress,
  updateAddress,
  updateCustomer,
  type AddressInput,
} from '@/services/shopify/customer-service';
import { UnauthenticatedError } from '@/lib/shopify/errors';

/**
 * Account server actions.
 *
 * Shopify remains the source of truth for profile and address data; these
 * actions validate input, forward it, and translate Shopify's field errors
 * back into per-field messages the form can render inline.
 */

const nameSchema = z.string().trim().min(1, 'Required').max(60);

const addressSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  company: z.string().trim().max(80).optional().or(z.literal('')),
  address1: z.string().trim().min(1, 'Required').max(120),
  address2: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Required').max(80),
  zoneCode: z.string().trim().max(10).optional().or(z.literal('')),
  territoryCode: z
    .string()
    .trim()
    .length(2, 'Use a 2-letter country code')
    .transform((value) => value.toUpperCase()),
  zip: z.string().trim().min(1, 'Required').max(20),
  phoneNumber: z.string().trim().max(30).optional().or(z.literal('')),
  makeDefault: z.coerce.boolean().optional(),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !result[key]) result[key] = issue.message;
  }
  return result;
}

function handle(error: unknown): ActionResult<never> {
  if (error instanceof UnauthenticatedError) {
    return { ok: false, error: 'Your session expired. Please sign in again.' };
  }
  if (error instanceof CustomerServiceError) {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

/** Strips empty optional strings — Shopify rejects "" where it expects null. */
function toAddressInput(data: z.infer<typeof addressSchema>): AddressInput {
  const input: AddressInput = {
    firstName: data.firstName,
    lastName: data.lastName,
    address1: data.address1,
    city: data.city,
    territoryCode: data.territoryCode,
    zip: data.zip,
  };
  if (data.company) input.company = data.company;
  if (data.address2) input.address2 = data.address2;
  if (data.zoneCode) input.zoneCode = data.zoneCode;
  if (data.phoneNumber) input.phoneNumber = data.phoneNumber;
  return input;
}

export type SavedProfile = { firstName: string | null; lastName: string | null };

export async function saveProfile(formData: FormData): Promise<ActionResult<SavedProfile>> {
  const parsed = z
    .object({ firstName: nameSchema, lastName: nameSchema })
    .safeParse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
    });

  if (!parsed.success) {
    return { ok: false, error: 'Please check the fields below.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    const saved = await updateCustomer(parsed.data);
    revalidatePath('/account');
    revalidatePath('/account/profile');
    // Echo back what Shopify confirmed, not what was submitted.
    return { ok: true, data: saved };
  } catch (error) {
    return handle(error);
  }
}

export async function saveAddress(formData: FormData): Promise<ActionResult> {
  const addressId = formData.get('addressId');
  const parsed = addressSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { ok: false, error: 'Please check the fields below.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const input = toAddressInput(parsed.data);
  const makeDefault = Boolean(parsed.data.makeDefault);

  try {
    if (typeof addressId === 'string' && addressId.length > 0) {
      await updateAddress(addressId, input, makeDefault);
    } else {
      await createAddress(input, makeDefault);
    }
    revalidatePath('/account/addresses');
    revalidatePath('/account');
    return { ok: true, data: undefined };
  } catch (error) {
    return handle(error);
  }
}

export async function removeAddress(formData: FormData): Promise<ActionResult> {
  const addressId = formData.get('addressId');
  if (typeof addressId !== 'string' || addressId.length === 0) {
    return { ok: false, error: 'That address could not be found.' };
  }

  try {
    await deleteAddress(addressId);
    revalidatePath('/account/addresses');
    revalidatePath('/account');
    return { ok: true, data: undefined };
  } catch (error) {
    return handle(error);
  }
}

export async function makeAddressDefault(formData: FormData): Promise<ActionResult> {
  const addressId = formData.get('addressId');
  if (typeof addressId !== 'string' || addressId.length === 0) {
    return { ok: false, error: 'That address could not be found.' };
  }

  // Shopify sets the default via the update mutation's defaultAddress flag; the
  // address fields are required, so they are re-sent unchanged from the form.
  const parsed = addressSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: 'That address is incomplete.' };

  try {
    await updateAddress(addressId, toAddressInput(parsed.data), true);
    revalidatePath('/account/addresses');
    return { ok: true, data: undefined };
  } catch (error) {
    return handle(error);
  }
}
