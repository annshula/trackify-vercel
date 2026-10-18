import { Icon } from "./icon";
import { cn } from "@/lib/utils/cn";

/**
 * Five stars filled in proportion to an average, so 4.9 reads as four and most
 * of a fifth rather than a rounded-up five.
 *
 * Decorative by design: it is always shown next to the number, so it is hidden
 * from assistive tech and the caller carries the accessible label.
 */
export function Stars({
  value,
  className,
  starClassName,
}: {
  value: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center gap-0.5 text-gold-500", className)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block">
            <Icon name="star" className={cn("size-4 text-gold-100", starClassName)} />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Icon name="star" className={cn("size-4 fill-current", starClassName)} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
