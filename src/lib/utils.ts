import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
interface Bin {
  min: number;
  max: number;
  count: number;
}

export function getTopPercentile(score: number): number {
  const bins: Bin[] = [
    { min: 0, max: 9, count: 131 },
    { min: 10, max: 19, count: 1342 },
    { min: 20, max: 29, count: 6281 },
    { min: 30, max: 39, count: 17908 },
    { min: 40, max: 49, count: 33854 },
    { min: 50, max: 59, count: 47847 },
    { min: 60, max: 69, count: 55820 },
    { min: 70, max: 79, count: 55417 },
    { min: 80, max: 89, count: 48560 },
    { min: 90, max: 99, count: 39255 },
    { min: 100, max: 109, count: 31469 },
    { min: 110, max: 119, count: 20420 },
    { min: 120, max: 129, count: 13466 },
    { min: 130, max: 139, count: 7794 },
    { min: 140, max: 149, count: 4554 },
    { min: 150, max: 159, count: 2518 },
    { min: 160, max: 169, count: 1278 },
    { min: 170, max: 179, count: 606 },
    { min: 180, max: 189, count: 291 },
    { min: 190, max: 199, count: 134 },
    { min: 200, max: 209, count: 81 },
    { min: 210, max: 219, count: 25 },
    { min: 220, max: 229, count: 23 },
    { min: 230, max: 239, count: 7 },
    { min: 240, max: 249, count: 8 },
    { min: 250, max: 259, count: 4 },
    { min: 260, max: 269, count: 3 },
    { min: 270, max: 279, count: 3 },
  ];

  const total: number = bins.reduce((acc, bin) => acc + bin.count, 0);
  let countAbove: number = 0;
  for (const bin of bins) {
    if (score < bin.min) {
      countAbove += bin.count;
    } else if (score >= bin.min && score <= bin.max) {
      const binRange: number = bin.max - bin.min + 1;
      const aboveInBin: number = bin.max - score;
      const fractionAbove: number = aboveInBin / binRange;
      countAbove += bin.count * fractionAbove;
    }
  }
  const percentile: number = (countAbove / total) * 100;
  return Math.round(percentile * 100) / 100;
}
