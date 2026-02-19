export type UUID = string;

export type Completeness = {
  score: number; // 0-100
  status: 'red' | 'amber' | 'green';
  missing: string[]; // e.g. ["parties_missing", "tracks_missing", "document_missing"]
  notes?: string[];
  // backwards compatibility fields consumed in some existing UI spots
  status_quo?: 'RED' | 'AMBER' | 'GREEN';
  reasons?: string[];
};

export type BulkJobStatus =
  | 'idle'
  | 'selecting_files'
  | 'uploading'
  | 'extracting'
  | 'extracted_partial'
  | 'extracted_complete'
  | 'creating_draft'
  | 'saving_parties'
  | 'failed'
  // compatibility with existing reducer states
  | 'draft_created_partial'
  | 'draft_created_complete'
  | 'completed';

export type BulkItemError = {
  code: string;
  message: string;
  error_id?: string | null;
};

export type PartyEntityType = 'artist' | 'organization' | 'individual' | 'external';

export type PartyRowInput = {
  role: string;
  entity_type: PartyEntityType;
  entity_id?: number | null;
  display_name: string;
  split_percent?: number | null;
  notes?: string | null;
  // compatibility with existing payload mode
  source?: 'system_entity' | 'external_party';
  party_ref?: { ref_type: 'artist' | 'individual' | 'organization'; ref_id: number; display_name?: string };
  external_name?: string;
  split?: { scope: 'master' | 'publishing' | 'other'; percent: number } | null;
  client_row_id?: string;
};

export type ContractExtractV2 = {
  version: 'v2';
  data: any;
  legacy?: Record<string, any>;
};

export type BulkItemPhase =
  | 'queued'
  | 'extracting'
  | 'extracted'
  | 'extract_failed'
  | 'draft_creating'
  | 'draft_created'
  | 'draft_failed'
  | 'parties_saving'
  | 'parties_saved'
  | 'parties_failed';

export type BulkItem = {
  file_id: string;
  filename: string;
  file: File | null;
  selected: boolean;

  phase: BulkItemPhase;

  extract?: ContractExtractV2;

  selected_track_ids: number[];

  parties: PartyRowInput[];

  created_contract_id?: number;
  created_document_id?: number;
  linked_tracks_count?: number;

  completeness?: Completeness;

  extracted_at?: string | null;
  created_at?: string | null;

  error: BulkItemError | null;

  // compatibility fields used by existing reducer/page
  include?: boolean;
  confirm_non_destructive?: boolean;
};

export type BulkBatchState = {
  batch_id: UUID | null;
  status: BulkJobStatus;
  is_busy: boolean;

  items: BulkItem[];

  selected_file_id: string | null;
  selected_only: boolean;
  search_filename: string;

  banner_error: string | null;
  banner_notice: string | null;

  flags: {
    AI_ENABLED: boolean;
    AI_CONTRACT_EXTRACT_V2_ENABLED: boolean;
    AI_LLM_ENABLED: boolean;
    AI_CONTRACT_TRACK_MAP_ENABLED: boolean;
  };
};

// Existing helper interfaces used by current components
export interface BatchFileListProps {
  items: BulkItem[];
  selected_file_id: string | null;
  onSelect: (file_id: string) => void;
  onToggleInclude: (file_id: string, checked: boolean) => void;
  filterText: string;
  onFilterTextChange: (v: string) => void;
}

export interface BulkContractDetailPanelProps {
  item: BulkItem | null;
  onUpdateTracks: (trackIds: number[]) => void;
  onUpdateParties: (parties: PartyRowInput[]) => void;
  onCreateDraft: () => Promise<void>;
  onSaveParties: () => Promise<void>;
}
