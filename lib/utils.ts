import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn helper: merge Tailwind class names safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
