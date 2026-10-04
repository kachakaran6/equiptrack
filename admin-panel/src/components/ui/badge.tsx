import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium transition-colors focus:outline-none select-none",
  {
    variants: {
      variant: {
        default:
          "border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800",
        secondary:
          "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800/60",
        outline:
          "border-zinc-800 text-zinc-300",
        destructive:
          "border-red-900/50 bg-red-950/40 text-red-400",
        success:
          "border-emerald-900/50 bg-emerald-950/40 text-emerald-400",
        warning:
          "border-amber-900/50 bg-amber-950/40 text-amber-400",
        info:
          "border-zinc-700 bg-zinc-800 text-zinc-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
