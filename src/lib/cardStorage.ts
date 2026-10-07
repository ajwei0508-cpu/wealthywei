import fs from "fs";
import path from "path";
import { Transaction, CategoryRule } from "@/types/cardExpense";
import { generateSampleTransactions } from "@/utils/cardParser";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const TXS_FILE = path.join(DATA_DIR, "card_transactions.json");
const RULES_FILE = path.join(DATA_DIR, "card_rules.json");
const SETTINGS_FILE = path.join(DATA_DIR, "card_settings.json");

// Ensure data dir exists
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load all transactions from server storage
export function getServerTransactions(): Transaction[] {
  ensureDir();
  try {
    if (!fs.existsSync(TXS_FILE)) {
      const initial = generateSampleTransactions();
      fs.writeFileSync(TXS_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const content = fs.readFileSync(TXS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading server transactions:", e);
    return [];
  }
}

// Overwrite all transactions on server
export function saveServerTransactions(txs: Transaction[]): boolean {
  ensureDir();
  try {
    fs.writeFileSync(TXS_FILE, JSON.stringify(txs, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing server transactions:", e);
    return false;
  }
}

// Append new transactions with duplicate check
export function appendServerTransactions(newTxs: Transaction[]): { added: Transaction[]; totalCount: number } {
  ensureDir();
  const current = getServerTransactions();
  const existingSet = new Set(current.map(c => `${c.date}_${c.merchant}_${c.amount}`));

  const added: Transaction[] = [];
  for (const tx of newTxs) {
    const key = `${tx.date}_${tx.merchant}_${tx.amount}`;
    if (!existingSet.has(key)) {
      existingSet.add(key);
      added.push(tx);
    }
  }

  if (added.length > 0) {
    const updated = [...added, ...current];
    saveServerTransactions(updated);
    return { added, totalCount: updated.length };
  }

  return { added: [], totalCount: current.length };
}

// Delete single or multiple transactions
export function deleteServerTransactions(ids: string[]): boolean {
  const current = getServerTransactions();
  const idSet = new Set(ids);
  const filtered = current.filter(t => !idSet.has(t.id));
  return saveServerTransactions(filtered);
}

// Rules storage
export function getServerRules(): CategoryRule[] {
  ensureDir();
  try {
    if (!fs.existsSync(RULES_FILE)) {
      return [];
    }
    const content = fs.readFileSync(RULES_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveServerRules(rules: CategoryRule[]): boolean {
  ensureDir();
  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
    return true;
  } catch (e) {
    return false;
  }
}

// CODEF / Card Settings storage
export interface CardApiSettings {
  codefClientId?: string;
  codefClientSecret?: string;
  codefPublicKey?: string;
  lastSyncTime?: number;
  connectedCards?: Array<{
    companyName: string;
    cardCode: string;
    authType: "cert" | "simple" | "idpw";
    lastSyncDate?: string;
  }>;
}

export function getServerCardSettings(): CardApiSettings {
  ensureDir();
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return {};
    }
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(content) || {};
  } catch (e) {
    return {};
  }
}

export function saveServerCardSettings(settings: CardApiSettings): boolean {
  ensureDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (e) {
    return false;
  }
}
