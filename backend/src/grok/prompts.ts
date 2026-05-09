// src/grok/prompts.ts
/**
 * @deprecated This module has been replaced by src/gsk/prompts.ts.
 * All exports are re-exported from the GSK module for backward compatibility.
 * Update your imports to: import { ... } from "../gsk/prompts.js"
 */

export {
  ATTACKER_SYSTEM_PROMPT,
  DEFENDER_SYSTEM_PROMPT,
  AUDITOR_SYSTEM_PROMPT,
  GSK_AGENTS,
  GSK_AGENTS as GROK_AGENTS,
  type GSKAgentLabel,
  type GSKAgentLabel as GrokAgentLabel,
} from "../gsk/prompts.js";
