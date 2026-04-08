import type { BankParser } from "@/lib/types";
import { ngenBankParser } from "./ngenBank";

const NGEN_ENTITY_ID = "ngen"; // Will be matched against DB entity id

// Registry of bank parsers by entity name (lowercase)
const parserRegistry: Record<string, BankParser> = {
  ngen: ngenBankParser,
};

export function getBankParser(entityName: string): BankParser | null {
  return parserRegistry[entityName.toLowerCase()] ?? null;
}

export function isBankParserAvailable(entityName: string): boolean {
  return entityName.toLowerCase() in parserRegistry;
}
