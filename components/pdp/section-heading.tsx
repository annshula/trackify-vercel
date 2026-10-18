import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Section title block shared by every PDP band: optional eyebrow, a heading in
 * the PDP heading face, optional intro. Centred on phones and tablets; from lg
 * up `align="left"` returns to a left-aligned column.
 */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  id?: string;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-2xl text-center",
        align === "left" && "lg:mx-0 lg:text-left",
        className,
      )}
    >
      {eyebrow && (
        <p className={cn("eyebrow eyebrow-dot mb-5", align === "center" && "justify-center")}>
          {eyebrow}
        </p>
      )}
      <Tag id={id} className="font-pdp-heading text-heading-1 font-semibold">
        {title}
      </Tag>
      {intro && <div className="mt-3 text-body text-ink-soft">{intro}</div>}
    </div>
  );
}
