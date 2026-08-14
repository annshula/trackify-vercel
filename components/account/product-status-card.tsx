import Image from 'next/image';
import type { Order, OrderLineItem, OrderReturnDetail, OrderReturnSummary, ReturnDeclineInfo } from '@/types/commerce';
import {
  shipmentSteps,
  statusTone,
  returnStatusLabel,
  returnReasonLabel,
  returnStatusDescription,
  returnDeclineReasonLabel,
  isFinalReturnStatus,
  type ShipmentGroup,
  type StatusTone,
} from '@/lib/account/order-status';
import { shortDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { CheckIcon, CloseIcon, PackageIcon, RefreshIcon, TruckIcon, XCircleIcon } from '@/components/ui/icons';

const TONE_STYLES: Record<StatusTone, { bar: string; iconBg: string; iconText: string; text: string }> = {
  success: { bar: 'bg-success', iconBg: 'bg-success-soft', iconText: 'text-success', text: 'text-success' },
  accent: { bar: 'bg-accent', iconBg: 'bg-accent-soft', iconText: 'text-accent', text: 'text-accent' },
  warning: { bar: 'bg-warning', iconBg: 'bg-warning-soft', iconText: 'text-warning', text: 'text-warning' },
  danger: { bar: 'bg-danger', iconBg: 'bg-danger-soft', iconText: 'text-danger', text: 'text-danger' },
  neutral: { bar: 'bg-line-strong', iconBg: 'bg-surface-sunken', iconText: 'text-ink-subtle', text: 'text-ink' },
  inverse: { bar: 'bg-ink', iconBg: 'bg-ink', iconText: 'text-canvas', text: 'text-ink' },
};

function StatusGlyph({ isReturning, fulfillmentStatus }: { isReturning: boolean; fulfillmentStatus: string | null }) {
  if (isReturning) return <RefreshIcon size={11} />;
  if (fulfillmentStatus === 'SUCCESS') return <CheckIcon size={11} />;
  if (fulfillmentStatus === 'CANCELLED' || fulfillmentStatus === 'FAILURE' || fulfillmentStatus === 'ERROR') {
    return <XCircleIcon size={11} />;
  }
  if (!fulfillmentStatus || fulfillmentStatus === 'UNFULFILLED' || fulfillmentStatus === 'OPEN' || fulfillmentStatus === 'PENDING_FULFILLMENT') {
    return <PackageIcon size={11} />;
  }
  return <TruckIcon size={11} />;
}

type TimelineNode = { id: string; label: string; at: string | null; state: 'done' | 'current' | 'failed' };

/**
 * The full real chain for a product: delivery history first, then — if this
 * exact item is covered by a return — that return's own real milestones,
 * using each timestamp Shopify actually reports. There's no "approved"
 * milestone here (the Customer Account API doesn't expose one, unlike
 * Admin's schema) — just requested (always dated) and the current/final
 * status. A final status is always `done` or `failed` regardless of whether
 * Shopify set `closedAt` — CANCELED/DECLINED don't get any less final just
 * because that timestamp happens to be missing.
 */
function buildProductTimeline(
  deliverySteps: { id: string; label: string; at: string | null }[],
  returnDetail: OrderReturnDetail | null,
): TimelineNode[] {
  const delivered: TimelineNode[] = [...deliverySteps].reverse().map((s) => ({ id: s.id, label: s.label, at: s.at, state: 'done' }));
  if (!returnDetail) return delivered;

  const requested: TimelineNode = { id: 'return-requested', label: 'Return requested', at: returnDetail.requestedAt, state: 'done' };
  if (returnDetail.status === 'REQUESTED') return [...delivered, requested];

  const label = returnStatusLabel(returnDetail.status);
  const state: TimelineNode['state'] =
    returnDetail.status === 'CLOSED'
      ? 'done'
      : returnDetail.status === 'CANCELED' || returnDetail.status === 'DECLINED'
        ? 'failed'
        : 'current';
  const statusStep: TimelineNode = {
    id: 'return-status',
    label,
    at: isFinalReturnStatus(returnDetail.status) ? (returnDetail.closedAt ?? returnDetail.updatedAt) : null,
    state,
  };

  return [...delivered, requested, statusStep];
}

/**
 * One card per product — tracks return/delivery progress per product rather
 * than per package, matching Shopify's own order-status page. Items shipped
 * together legitimately show the same real dates (they share one
 * fulfillment); an item covered by a return gets that return's own real
 * milestones appended after its delivery history, never a shared "package"
 * status.
 */
export function ProductStatusCard({
  item,
  group,
  order,
  returnStatus,
  declineReasons,
}: {
  item: OrderLineItem;
  group: ShipmentGroup;
  order: Order;
  returnStatus: OrderReturnSummary | null;
  declineReasons: Record<string, ReturnDeclineInfo>;
}) {
  const returnDetail = returnStatus?.returns.find((r) => r.lineItemIds.includes(item.id)) ?? null;
  const isReturning = returnDetail !== null;
  const declineInfo = returnDetail ? (declineReasons[returnDetail.id] ?? null) : null;

  const steps = shipmentSteps(group, order);
  const timeline = buildProductTimeline(steps, returnDetail);
  const trackingLinks = (group.fulfillment?.trackingInformation ?? []).filter((info) => info.url);

  const tone: StatusTone = returnDetail
    ? returnDetail.status === 'CLOSED'
      ? 'success'
      : returnDetail.status === 'CANCELED' || returnDetail.status === 'DECLINED'
        ? 'danger'
        : 'accent'
    : statusTone(group.fulfillment?.status ?? null);
  const styles = TONE_STYLES[tone];

  const headingLabel = returnDetail ? returnStatusLabel(returnDetail.status) : steps[0]?.label;
  const headingDate = returnDetail ? (returnDetail.closedAt ?? returnDetail.updatedAt) : steps[0]?.at;
  const returnDescription = returnDetail ? returnStatusDescription(returnDetail.status) : null;
  const returnReason = returnDetail?.lineItemReasons[item.id] ?? null;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-line bg-surface shadow-e1 transition-shadow duration-200 hover:shadow-e2">
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', styles.bar)} />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex gap-3">
          <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
            {item.image && (
              <Image src={item.image.url} alt={item.image.altText ?? item.title} fill sizes="56px" className="object-cover" />
            )}
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.variantTitle && item.variantTitle !== 'Default Title' && (
              <p className="text-xs text-ink-subtle">{item.variantTitle}</p>
            )}

            {headingLabel && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={cn('grid size-5 shrink-0 place-items-center rounded-full', styles.iconBg, styles.iconText)}>
                  <StatusGlyph isReturning={isReturning} fulfillmentStatus={group.fulfillment?.status ?? null} />
                </span>
                <p className={cn('text-xs font-semibold', styles.text)}>
                  {headingLabel}
                  {headingDate && ` · ${shortDate(headingDate)}`}
                </p>
              </div>
            )}
          </div>

          <span className="shrink-0 pt-0.5 text-xs text-ink-subtle tabular-nums">×{item.quantity}</span>
        </div>

        {timeline.length > 1 && <MiniStepper steps={timeline} />}

        {(returnDescription || returnReason || declineInfo || returnDetail?.tracking?.number) && (
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {returnDescription && <p className="text-ink-muted">{returnDescription}</p>}
            {returnReason && (
              <p className="text-ink-subtle">
                Reason: <span className="font-medium text-ink">{returnReasonLabel(returnReason)}</span>
              </p>
            )}
            {declineInfo && (
              <p className="text-danger">
                Declined: <span className="font-medium">{returnDeclineReasonLabel(declineInfo.reason)}</span>
                {declineInfo.note && <span className="text-danger/80"> — {declineInfo.note}</span>}
              </p>
            )}
            {returnDetail?.tracking?.number && (
              <p className="text-ink-subtle">
                Tracking:{' '}
                {returnDetail.tracking.url ? (
                  <a
                    href={returnDetail.tracking.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink underline underline-offset-4"
                  >
                    {returnDetail.tracking.number}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="font-medium text-ink">{returnDetail.tracking.number}</span>
                )}
              </p>
            )}
          </div>
        )}

        {!isReturning && trackingLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
            {trackingLinks.map((info) => (
              <a
                key={info.url ?? info.number ?? 'tracking'}
                href={info.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
              >
                <TruckIcon size={13} />
                Track with {info.company ?? 'the carrier'}
                {info.number && <span className="font-normal text-ink-subtle">· {info.number}</span>}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Horizontal, chronological (oldest → newest) mini progress line. `current` renders as a pulsing accent dot instead of a checkmark — the one step that hasn't actually completed yet. */
const STEP_LABEL_COLOR: Record<TimelineNode['state'], string> = {
  done: 'text-ink',
  current: 'text-accent',
  failed: 'text-danger',
};

function MiniStepper({ steps }: { steps: TimelineNode[] }) {
  return (
    <div className="mt-3 flex items-start border-t border-line pt-3.5">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <div key={step.id} className={cn('flex items-start', isLast ? 'shrink-0' : 'flex-1')}>
            <div className="flex w-14 shrink-0 flex-col items-center gap-1.5 text-center">
              <MiniStepDot state={step.state} />
              <div>
                <p className={cn('text-[11px] leading-tight font-medium', STEP_LABEL_COLOR[step.state])}>{step.label}</p>
                {step.at && <p className="text-[10px] leading-tight text-ink-subtle">{shortDate(step.at)}</p>}
              </div>
            </div>
            {!isLast && (
              <div className={cn('mt-2 h-0.5 flex-1 rounded-full', step.state === 'done' ? 'bg-success' : 'bg-line')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniStepDot({ state }: { state: TimelineNode['state'] }) {
  if (state === 'current') {
    return (
      <span className="relative grid size-4 place-items-center rounded-full bg-accent">
        <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-accent opacity-40 motion-reduce:hidden" />
        <span className="relative size-1.5 rounded-full bg-on-accent" />
      </span>
    );
  }

  if (state === 'failed') {
    return (
      <span className="grid size-4 place-items-center rounded-full bg-danger text-white ring-4 ring-danger-soft">
        <CloseIcon size={8} />
      </span>
    );
  }

  return (
    <span className="grid size-4 place-items-center rounded-full bg-success text-white ring-4 ring-success-soft">
      <CheckIcon size={9} />
    </span>
  );
}
