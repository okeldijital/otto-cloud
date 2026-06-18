export {
  registerSection,
  getSection,
  getSectionsForTemplate,
  getAllSections,
  ensureSectionsLoaded,
} from "./registry";

export {
  calculateReadiness,
  calculateWorkspaceHealth,
} from "./readiness";

export type {
  SectionPlugin,
  SectionProps,
  WorkspaceEngineConfig,
  ReadinessCategory,
  ReadinessResult,
  WorkspaceHealthItem,
  WorkspaceHealthResult,
} from "./types";

export { SECTION_ICONS } from "./types";
