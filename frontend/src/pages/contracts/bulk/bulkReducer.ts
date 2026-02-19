import type {
  BulkBatchState,
  BulkItem,
  BulkItemError,
  BulkJobStatus,
  ContractExtractV2,
  PartyRowInput,
  UUID,
  Completeness,
} from './types';

export type BulkAction =
  | { type: 'BULK/INIT' }
  | { type: 'BULK/SET_FLAGS'; flags: BulkBatchState['flags'] }
  | { type: 'BULK/SET_STATUS'; status: BulkJobStatus }
  | { type: 'BULK/SET_BANNER_ERROR'; message: string | null }
  | { type: 'BULK/SET_BANNER_NOTICE'; message: string | null }
  | { type: 'BULK/SET_SELECTED_ONLY'; value: boolean }
  | { type: 'BULK/SET_SEARCH_FILENAME'; value: string }
  | { type: 'BULK/SELECT_ITEM'; file_id: string | null }
  | { type: 'BATCH/SELECT_ALL_VISIBLE' }
  | { type: 'BATCH/CLEAR_SELECTION' }
  | { type: 'BATCH/TOGGLE_ITEM_SELECTED'; file_id: string; selected: boolean }
  | { type: 'BATCH/APPLY_TRACKS_TO_SELECTED'; track_ids: number[] }
  | { type: 'BATCH/APPLY_PARTIES_TO_SELECTED'; parties: PartyRowInput[] }

  | {
      type: 'FILES/ADD';
      batch_id: UUID;
      files: Array<{ file_id: string; filename: string; file: File }>;
    }
  | { type: 'FILES/REMOVE'; file_id: string }
  | { type: 'FILES/CLEAR_ALL' }

  | { type: 'EXTRACT/START'; file_ids: string[] }
  | {
      type: 'EXTRACT/RESULT_OK';
      file_id: string;
      extract: ContractExtractV2;
      extracted_at?: string | null;
    }
  | { type: 'EXTRACT/RESULT_ERR'; file_id: string; error: BulkItemError }
  | { type: 'EXTRACT/FINISH' }

  | { type: 'ITEM/SET_TRACKS'; file_id: string; track_ids: number[] }
  | { type: 'ITEM/SET_PARTIES'; file_id: string; parties: PartyRowInput[] }
  | { type: 'ITEM/SET_INCLUDE'; file_id: string; value: boolean }
  | { type: 'ITEM/SET_CONFIRM_NON_DESTRUCTIVE'; file_id: string; value: boolean }

  | { type: 'DRAFT/START'; file_id: string }
  | {
      type: 'DRAFT/SUCCESS';
      file_id: string;
      created_contract_id: number;
      created_document_id: number;
      linked_tracks_count: number;
      completeness: Completeness;
      created_at?: string | null;
    }
  | { type: 'DRAFT/ERROR'; file_id: string; error: BulkItemError }

  | { type: 'PARTIES/START'; file_id: string }
  | {
      type: 'PARTIES/SUCCESS';
      file_id: string;
      saved_count: number;
      completeness: Completeness;
    }
  | { type: 'PARTIES/ERROR'; file_id: string; error: BulkItemError };

export const initialBulkState: BulkBatchState = {
  batch_id: null,
  status: 'idle',
  items: [],
  selected_file_id: null,
  selected_only: false,
  search_filename: '',
  banner_error: null,
  banner_notice: null,
  flags: {
    AI_ENABLED: false,
    AI_CONTRACT_EXTRACT_V2_ENABLED: false,
    AI_LLM_ENABLED: false,
    AI_CONTRACT_TRACK_MAP_ENABLED: false,
  },
  is_busy: false,
};

function updateItem(
  state: BulkBatchState,
  file_id: string,
  fn: (item: BulkItem) => BulkItem,
): BulkBatchState {
  const idx = state.items.findIndex((x) => x.file_id === file_id);
  if (idx === -1) return state;
  const nextItems = state.items.slice();
  nextItems[idx] = fn(nextItems[idx]);
  return { ...state, items: nextItems };
}

function setBusyFromStatus(status: BulkJobStatus): boolean {
  return (
    status === 'selecting_files' ||
    status === 'extracting' ||
    status === 'creating_draft' ||
    status === 'saving_parties'
  );
}

function mkBaseItem(input: {
  file_id: string;
  filename: string;
  file: File;
}): BulkItem {
  return {
    file_id: input.file_id,
    filename: input.filename,
    file: input.file,
    selected: true,
    phase: 'queued',
    include: true,
    confirm_non_destructive: false,
    selected_track_ids: [],
    parties: [],
    error: null,
  };
}

export function bulkReducer(
  state: BulkBatchState,
  action: BulkAction,
): BulkBatchState {
  switch (action.type) {
    case 'BULK/INIT': {
      return { ...initialBulkState };
    }
    case 'BULK/SET_FLAGS': {
      return { ...state, flags: action.flags };
    }
    case 'BULK/SET_STATUS': {
      const is_busy = setBusyFromStatus(action.status);
      return { ...state, status: action.status, is_busy };
    }
    case 'BULK/SET_BANNER_ERROR': {
      return { ...state, banner_error: action.message };
    }
    case 'BULK/SET_BANNER_NOTICE': {
      return { ...state, banner_notice: action.message };
    }
    case 'BULK/SET_SELECTED_ONLY': {
      return { ...state, selected_only: action.value };
    }
    case 'BULK/SET_SEARCH_FILENAME': {
      return { ...state, search_filename: action.value };
    }
    case 'BULK/SELECT_ITEM': {
      return { ...state, selected_file_id: action.file_id };
    }
    case 'BATCH/SELECT_ALL_VISIBLE': {
      return { ...state, items: state.items.map((it) => ({ ...it, selected: true })) };
    }
    case 'BATCH/CLEAR_SELECTION': {
      return { ...state, items: state.items.map((it) => ({ ...it, selected: false })) };
    }
    case 'BATCH/TOGGLE_ITEM_SELECTED': {
      return updateItem(state, action.file_id, (it) => ({ ...it, selected: action.selected }));
    }
    case 'BATCH/APPLY_TRACKS_TO_SELECTED': {
      return {
        ...state,
        items: state.items.map((it) =>
          it.selected ? { ...it, selected_track_ids: [...action.track_ids] } : it,
        ),
      };
    }
    case 'BATCH/APPLY_PARTIES_TO_SELECTED': {
      return {
        ...state,
        items: state.items.map((it) =>
          it.selected ? { ...it, parties: action.parties.map((p) => ({ ...p })) } : it,
        ),
      };
    }

    case 'FILES/ADD': {
      const newItems = action.files.map(mkBaseItem);
      const nextItems = [...state.items, ...newItems];
      const selected_file_id = state.selected_file_id ?? (newItems[0]?.file_id ?? null);

      return {
        ...state,
        batch_id: action.batch_id,
        items: nextItems,
        selected_file_id,
        banner_error: null,
        banner_notice: null,
      };
    }

    case 'FILES/REMOVE': {
      const nextItems = state.items.filter((x) => x.file_id !== action.file_id);
      const selected_file_id =
        state.selected_file_id === action.file_id
          ? nextItems[0]?.file_id ?? null
          : state.selected_file_id;
      return { ...state, items: nextItems, selected_file_id };
    }

    case 'FILES/CLEAR_ALL': {
      return {
        ...state,
        batch_id: null,
        items: [],
        selected_file_id: null,
        banner_error: null,
        banner_notice: null,
      };
    }

    case 'EXTRACT/START': {
      const fileIds = new Set(action.file_ids);
      const next = {
        ...state,
        status: 'extracting' as BulkJobStatus,
        is_busy: true,
        banner_error: null,
        banner_notice: null,
      };

      return {
        ...next,
        items: next.items.map((it) =>
          fileIds.has(it.file_id) ? { ...it, phase: 'extracting', error: null } : it,
        ),
      };
    }

    case 'EXTRACT/RESULT_OK': {
      return updateItem(state, action.file_id, (it) => ({
        ...it,
        phase: 'extracted',
        extract: action.extract,
        extracted_at: action.extracted_at ?? null,
        error: null,
      }));
    }

    case 'EXTRACT/RESULT_ERR': {
      return updateItem(state, action.file_id, (it) => ({
        ...it,
        phase: 'extract_failed',
        error: action.error,
      }));
    }

    case 'EXTRACT/FINISH': {
      const anyFailed = state.items.some((x) => x.phase === 'extract_failed');
      const anyExtracted = state.items.some((x) => x.phase === 'extracted');
      const status: BulkJobStatus =
        anyExtracted && anyFailed
          ? 'extracted_partial'
          : anyExtracted
            ? 'extracted_complete'
            : 'failed';
      return { ...state, status, is_busy: false };
    }

    case 'ITEM/SET_TRACKS': {
      return updateItem(state, action.file_id, (it) => ({ ...it, selected_track_ids: action.track_ids }));
    }

    case 'ITEM/SET_PARTIES': {
      return updateItem(state, action.file_id, (it) => ({ ...it, parties: action.parties }));
    }

    case 'ITEM/SET_INCLUDE': {
      return updateItem(state, action.file_id, (it) => ({ ...it, include: action.value }));
    }

    case 'ITEM/SET_CONFIRM_NON_DESTRUCTIVE': {
      return updateItem(state, action.file_id, (it) => ({ ...it, confirm_non_destructive: action.value }));
    }

    case 'DRAFT/START': {
      const st = { ...state, status: 'creating_draft' as BulkJobStatus, is_busy: true };
      return updateItem(st, action.file_id, (it) => ({ ...it, phase: 'draft_creating', error: null }));
    }

    case 'DRAFT/SUCCESS': {
      const st = { ...state, is_busy: false };
      return updateItem(st, action.file_id, (it) => ({
        ...it,
        phase: 'draft_created',
        created_contract_id: action.created_contract_id,
        created_document_id: action.created_document_id,
        linked_tracks_count: action.linked_tracks_count,
        completeness: action.completeness,
        created_at: action.created_at ?? null,
        error: null,
      }));
    }

    case 'DRAFT/ERROR': {
      const st = { ...state, is_busy: false, status: 'failed' as BulkJobStatus };
      return updateItem(st, action.file_id, (it) => ({ ...it, phase: 'draft_failed', error: action.error }));
    }

    case 'PARTIES/START': {
      const st = { ...state, status: 'saving_parties' as BulkJobStatus, is_busy: true };
      return updateItem(st, action.file_id, (it) => ({ ...it, phase: 'parties_saving', error: null }));
    }

    case 'PARTIES/SUCCESS': {
      const st = { ...state, is_busy: false };
      return updateItem(st, action.file_id, (it) => ({
        ...it,
        phase: 'parties_saved',
        completeness: action.completeness,
        error: null,
      }));
    }

    case 'PARTIES/ERROR': {
      const st = { ...state, is_busy: false, status: 'failed' as BulkJobStatus };
      return updateItem(st, action.file_id, (it) => ({ ...it, phase: 'parties_failed', error: action.error }));
    }

    default:
      return state;
  }
}

export function selectCurrentItem(state: BulkBatchState): BulkItem | null {
  if (!state.selected_file_id) return null;
  return state.items.find((x) => x.file_id === state.selected_file_id) ?? null;
}

export function selectVisibleItems(state: BulkBatchState): BulkItem[] {
  const q = state.search_filename.trim().toLowerCase();
  return state.items.filter((it) => {
    if (q && !it.filename.toLowerCase().includes(q)) return false;
    if (state.selected_only) return Boolean(it.selected);
    return true;
  });
}

export function canCreateDraft(item: BulkItem | null): {
  ok: boolean;
  missing: string[];
} {
  if (!item) return { ok: false, missing: ['no item selected'] };

  const missing: string[] = [];
  if (!item.extract || item.extract.version !== 'v2') missing.push('run extract');
  if (!item.selected_track_ids || item.selected_track_ids.length === 0) missing.push('select track(s)');
  if (!item.confirm_non_destructive) missing.push('confirm non-destructive');

  return { ok: missing.length === 0, missing };
}

export function canSaveParties(item: BulkItem | null): {
  ok: boolean;
  missing: string[];
} {
  if (!item) return { ok: false, missing: ['no item selected'] };

  const missing: string[] = [];
  if (!item.created_contract_id) missing.push('create draft first');

  return { ok: missing.length === 0, missing };
}
