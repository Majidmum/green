import Image from "next/image";

// Логотип магазина. variant="light" — светлая версия для тёмного фона (футер).
export default function Logo({ size = 44, variant = "default", priority = false, className = "" }) {
  return (
    <Image
      src={variant === "light" ? "/logo-light.png" : "/logo.png"}
      alt="Green Garden"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
