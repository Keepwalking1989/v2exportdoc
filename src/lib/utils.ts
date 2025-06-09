import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to convert number to words (Simplified English version)
export function amountToWords(amount: number, currency: string): string {
  const единицы = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
  ];
  const десятки = [
    "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
  ];
  const степени = ["", "THOUSAND", "MILLION", "BILLION"]; // Extend if needed

  function convertChunk(num: number): string {
    if (num === 0) return "";
    if (num < 20) return единицы[num] + " ";
    if (num < 100) return десятки[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + единицы[num % 10] : "") + " ";
    if (num < 1000) return единицы[Math.floor(num / 100)] + " HUNDRED " + convertChunk(num % 100);
    return "";
  }

  if (amount === 0) return `${currency} ZERO ONLY`;

  let words = "";
  let num = Math.floor(amount); // Integer part
  let i = 0;

  while (num > 0) {
    if (num % 1000 !== 0) {
      words = convertChunk(num % 1000) + степени[i] + " " + words;
    }
    num = Math.floor(num / 1000);
    i++;
  }

  const decimalPart = Math.round((amount - Math.floor(amount)) * 100);
  if (decimalPart > 0) {
    words += "AND " + convertChunk(decimalPart) + "CENTS ";
  }
  
  // Clean up extra spaces and add currency and "ONLY"
  return `${currency.toUpperCase()} ${words.replace(/\s+/g, ' ').trim()} ONLY`;
}
