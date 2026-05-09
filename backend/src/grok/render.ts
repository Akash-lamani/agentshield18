// src/grok/render.ts
/**
 * @deprecated This module has been replaced by src/gsk/render.ts.
 * All exports are re-exported from the GSK module for backward compatibility.
 * Update your imports to: import { ... } from "../gsk/render.js"
 *
 * Provider change: xAI Grok-3 → Google Gemini (gemini-2.5-pro)
 * Env variable change: XAI_API_KEY → GSK_API_KEY
 */

export {
  runGSKPipeline,
  runGSKPipeline as runGrokPipeline,
} from "../gsk/render.js";
