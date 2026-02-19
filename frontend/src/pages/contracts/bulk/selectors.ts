import type { BulkBatchState, BulkItem } from './types';

export function getSelectedItem(state: BulkBatchState): BulkItem | null {
  return state.items.find((item) => item.file_id === state.selected_file_id) || null;
}

export function getSelectedItemsForRun(state: BulkBatchState): BulkItem[] {
  return state.items.filter((item) => item.include);
}

export function isBatchRunnable(state: BulkBatchState): boolean {
  return !state.is_busy && getSelectedItemsForRun(state).length > 0;
}

export function canCreateDraft(item: BulkItem | null): { ok: boolean; reasons: string[] } {
  if (!item) return { ok: false, reasons: ['Select a file row'] };

  const reasons: string[] = [];
  if (!item.extract || item.phase === 'extract_failed') reasons.push('Run extract first');
  if (!item.selected_track_ids?.length) reasons.push('Select at least one track');
  if (!item.confirm_non_destructive) reasons.push('Confirm non-destructive');

  return { ok: reasons.length === 0, reasons };
}

export function canSaveParties(item: BulkItem | null): boolean {
  if (!item) return false;
  return Boolean(item.created_contract_id);
}
