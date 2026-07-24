import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return "<1 ms";
  return `${ms.toFixed(1)} ms`;
}
