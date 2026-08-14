'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult, ReturnLineItemInput } from '@/types/commerce';
import { cancelOrder, OrderActionError } from '@/services/shopify/order-actions-service';
import { requestReturn, CustomerServiceError } from '@/services/shopify/customer-service';
import { UnauthenticatedError } from '@/lib/shopify/errors';

/**
 * Order-level server actions: cancel (live, calls the real Admin API — see
 * `order-actions-service.ts` for the ownership gate) and return request
 * (live, calls the real Customer Account API — see `requestReturn` in
 * customer-service.ts).
 */

function handle(error: unknown): ActionResult<never> {
  if (error instanceof UnauthenticatedError) {
    return { ok: false, error: 'Your session expired. Please sign in again.' };
  }
  if (error instanceof OrderActionError || error instanceof CustomerServiceError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

const cancelSchema = z.object({
  orderId: z.string().trim().min(1),
  reason: z.enum(['CUSTOMER', 'OTHER']),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  refundMethod: z.enum(['ORIGINAL_PAYMENT_METHOD', 'STORE_CREDIT']),
  restock: z.coerce.boolean(),
  notifyCustomer: z.coerce.boolean(),
});

export async function cancelOrderAction(formData: FormData): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse({
    orderId: formData.get('orderId'),
    reason: formData.get('reason'),
    note: formData.get('note') ?? '',
    refundMethod: formData.get('refundMethod'),
    restock: formData.get('restock') === 'true',
    notifyCustomer: formData.get('notifyCustomer') === 'true',
  });

  if (!parsed.success) {
    return { ok: false, error: 'That cancellation request was incomplete.' };
  }

  try {
    await cancelOrder({
      orderId: parsed.data.orderId,
      reason: parsed.data.reason,
      note: parsed.data.note || undefined,
      refundMethod: parsed.data.refundMethod,
      restock: parsed.data.restock,
      notifyCustomer: parsed.data.notifyCustomer,
    });
    revalidatePath(`/account/orders/${encodeURIComponent(parsed.data.orderId)}`);
    revalidatePath('/account/orders');
    return { ok: true, data: undefined };
  } catch (error) {
    return handle(error);
  }
}

const returnItemSchema = z.object({
  orderId: z.string().trim().min(1),
  lineItemId: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  reason: z.enum(['SIZE_TOO_SMALL', 'SIZE_TOO_LARGE', 'UNWANTED', 'NOT_AS_DESCRIBED', 'WRONG_ITEM', 'DEFECTIVE', 'STYLE', 'COLOR', 'OTHER']),
});

const returnRequestSchema = z.array(returnItemSchema).min(1, 'Select at least one item to return.');

/**
 * Submits a real return request via `requestReturn` (Customer Account API's
 * `orderRequestReturn` mutation). Every item here comes from one order's
 * return page, so they all share the same `orderId`.
 */
export async function requestReturnAction(items: ReturnLineItemInput[]): Promise<ActionResult> {
  const parsed = returnRequestSchema.safeParse(items);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'That return request was incomplete.' };
  }

  const orderId = parsed.data[0]?.orderId;
  if (!orderId) return { ok: false, error: 'That return request was incomplete.' };

  try {
    await requestReturn(
      orderId,
      parsed.data.map((item) => ({ lineItemId: item.lineItemId, quantity: item.quantity, reason: item.reason })),
    );
    revalidatePath(`/account/orders/${encodeURIComponent(orderId)}`);
    revalidatePath(`/account/orders/${encodeURIComponent(orderId)}/return`);
    return { ok: true, data: undefined };
  } catch (error) {
    return handle(error);
  }
}
