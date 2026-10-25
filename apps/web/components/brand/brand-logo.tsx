import Image from "next/image";

import { cn } from "@/lib/utils";

const MARK_SRC = "/brand/opspilot-mark.png";

type BrandLogoProps = {
  /** Pixel size of the square mark. */
  size?: number;
  className?: string;
  priority?: boolean;
};

/** OpsPilot OP mark for chrome (sidebar, auth). */
export function BrandLogo({
  size = 40,
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={MARK_SRC}
      alt="OpsPilot"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-md", className)}
    />
  );
}
