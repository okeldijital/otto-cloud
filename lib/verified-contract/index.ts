/**
 * Verified Contract Domain — platform integration surface (Milestone 3.2).
 *
 * Consumers: Release Workspace, Rights, Royalties, Reporting, Search — via read APIs only.
 * Never read AI drafts for trusted automation.
 */

export {
  VerifiedContractService,
  verifiedContractService,
} from "./verified-contract-service";
export { promoteVerifiedContract, parsePartyNames } from "./promotion";
export {
  publishVerifiedContractEvent,
  VERIFIED_CONTRACT_EVENTS,
} from "./events";
export type { PromoteInput, FieldProvenance } from "./promotion";
