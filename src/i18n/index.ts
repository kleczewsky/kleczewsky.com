import type { Locale } from "../routes";
import en, { type Dict } from "./en";
import pl from "./pl";

export const DICTS: Record<Locale, Dict> = { en, pl };
export type { Dict };
