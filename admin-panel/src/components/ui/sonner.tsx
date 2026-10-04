import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-950 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg group-[.toaster]:text-xs font-mono",
          description: "group-[.toast]:text-zinc-400 font-sans",
          actionButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-900 font-sans",
          cancelButton:
            "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400 font-sans",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
