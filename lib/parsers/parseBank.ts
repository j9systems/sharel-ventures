import { universalBankParser } from "./universalBank";
import type { BankParser } from "@/lib/types";

export function getBankParser(_entityName: string): BankParser {
  return universalBankParser;
}

export function isBankParserAvailable(_entityName: string): boolean {
  return true;
}
