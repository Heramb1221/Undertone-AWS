import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantStyles: Record<Variant, string> = {
  primary: "bg-accent-primary text-[#2B1608] hover:opacity-90",
  secondary: "bg-transparent border border-border-subtle text-text-primary hover:bg-elevated",
  danger: "bg-transparent border border-accent-danger text-accent-danger hover:bg-accent-danger hover:text-white",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}
