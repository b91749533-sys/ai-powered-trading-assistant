import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline";
  children: ReactNode;
}

export default function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  let baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none flex items-center justify-center gap-2";
  let variantStyle = "";

  if (variant === "primary") {
    variantStyle = "bg-trading-green text-black hover:bg-trading-green/90 font-semibold disabled:bg-trading-green/50";
  } else if (variant === "danger") {
    variantStyle = "bg-trading-red text-white hover:bg-trading-red/90 disabled:bg-trading-red/50";
  } else if (variant === "outline") {
    variantStyle = "border border-trading-border text-white hover:bg-trading-border/50 disabled:border-trading-border/50 disabled:text-trading-textSecondary";
  } else {
    variantStyle = "bg-trading-border text-white hover:bg-trading-border/80 disabled:bg-trading-border/30 disabled:text-trading-textSecondary";
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
