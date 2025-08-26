import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to convert number to words (Supports USD, EUR, INR)
export function amountToWords(amount: number, currency: 'USD' | 'EUR' | 'INR'): string {
  const units = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const scales = ["", "THOUSAND", "MILLION", "BILLION"];

  const currencyDetails = {
    USD: { major: "DOLLAR", minor: "CENT" },
    EUR: { major: "EURO", minor: "CENT" },
    INR: { major: "RUPEE", minor: "PAISA" },
  };

  const { major, minor } = currencyDetails[currency];

  function convertChunk(num: number): string {
    if (num === 0) return "";
    if (num < 20) return units[num] + " ";
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + units[num % 10] : "") + " ";
    if (num < 1000) return units[Math.floor(num / 100)] + " HUNDRED " + convertChunk(num % 100);
    return "";
  }

  if (amount === 0) return `${currency.toUpperCase()} ZERO ONLY`;

  let words = "";
  let num = Math.floor(amount);
  let i = 0;

  do {
    const chunk = num % 1000;
    if (chunk !== 0) {
      words = convertChunk(chunk) + scales[i] + " " + words;
    }
    num = Math.floor(num / 1000);
    i++;
  } while (num > 0);

  // Handle the major currency part
  words = words.trim() + " " + (Math.floor(amount) === 1 ? major : `${major}S`);

  const decimalPart = Math.round((amount - Math.floor(amount)) * 100);
  if (decimalPart > 0) {
    words += " AND " + convertChunk(decimalPart) + (decimalPart === 1 ? minor : `${minor}S`);
  }
  
  return `${currency.toUpperCase()} ${words.replace(/\s+/g, ' ').trim()} ONLY`;
}
