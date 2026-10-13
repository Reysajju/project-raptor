import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A styled keyboard key indicator. Matches the existing kbd style used in
 * the topbar search button and command palette footer.
 */
function Kbd({
  className,
  ...props
}: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
