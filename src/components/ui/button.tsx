import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 will-change-transform will-change-opacity select-none active:animate-button-press",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/75",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/75",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/60",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/20",
        link: 
          "text-primary underline-offset-4 hover:underline active:text-primary/70",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (props.disabled) return;
      
      // Enhanced haptic feedback based on variant
      switch (variant) {
        case 'destructive':
          await haptics.heavy();
          break;
        case 'default':
        case 'secondary':
          await haptics.medium();
          break;
        case 'outline':
        case 'ghost':
          await haptics.light();
          break;
        case 'link':
          await haptics.light();
          break;
        default:
          await haptics.medium();
      }

      props.onClick?.(e);
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          'motion-safe:transition-colors motion-safe:duration-50'
        )}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
