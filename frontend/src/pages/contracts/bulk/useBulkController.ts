import { useCallback } from 'react';
import type { BulkBatchState } from './types';
import type { BulkAction } from './bulkReducer';
import { canSaveParties } from './bulkReducer';
import contractsBulkClient from '../../../api/contractsBulkClient';

function stableUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toUiError(e: any) {
  const status = e?.response?.status;
  const data = e?.response?.data;

  const error_id = data?.error_id ?? null;
  const detail = data?.detail ?? data?.message ?? e?.message ?? 'Request failed';

  return {
    code: String(data?.code ?? status ?? 'error'),
    message: String(detail),
    error_id,
  };
}

function normalizeCompleteness(resp: any) {
  if (resp?.completeness) {
    const c = resp.completeness;
    const statusRaw =
      c?.status ||
      c?.color ||
      (String(c?.status_quo || 'red').toLowerCase());
    const status = String(statusRaw).toLowerCase();
    const missing = Array.isArray(c?.missing)
      ? c.missing
      : Array.isArray(c?.reasons)
        ? c.reasons
        : [];
    const notes = Array.isArray(c?.notes) ? c.notes : [];
    return {
      ...c,
      status,
      color: status,
      missing,
      notes,
    };
  }
  return {
    score: 0,
    status: 'red',
    missing: ['missing_document', 'missing_tracks', 'missing_parties'],
  };
}

function normalizeExtract(result: any) {
  return result?.extract || null;
}

export function useBulkController(state: BulkBatchState, dispatch: (a: BulkAction) => void) {
  const addFiles = useCallback(async (files: File[]) => {
    if (!files?.length) return;

    dispatch({ type: 'BULK/SET_STATUS', status: 'selecting_files' });

    const batch_id = stableUuid();
    const mapped = files.map((f, idx) => ({
      file_id: `f_${Date.now()}_${idx}`,
      filename: f.name,
      file: f,
    }));

    dispatch({ type: 'FILES/ADD', batch_id, files: mapped });
    dispatch({ type: 'BULK/SET_STATUS', status: 'idle' });
    dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: `${mapped.length} file(s) selected` });
  }, [dispatch]);

  const runBulkExtract = useCallback(async (file_ids: string[]) => {
    const items = state.items.filter((x) => file_ids.includes(x.file_id));
    if (items.length === 0) return;

    // Check if files are real File objects
    const hasFiles = items.every((x) => x.file instanceof File);
    if (!hasFiles) {
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: "Internal Error: Selected items logic invalid (missing File objects)." });
      return;
    }

    dispatch({ type: 'EXTRACT/START', file_ids });
    dispatch({ type: 'BULK/SET_STATUS', status: 'uploading' });

    try {
      const formData = new FormData();
      for (const item of items) {
        if (item.file) {
          formData.append("files", item.file, item.filename);
        }
      }

      const resp = await contractsBulkClient.extractBulk(formData);

      const results = Array.isArray(resp?.results) ? resp.results : [];
      if (!results.length) {
        throw new Error('No extraction results returned by backend');
      }

      const filenameToFileId = new Map<string, string>();
      for (const item of items) {
        filenameToFileId.set(item.filename, item.file_id);
      }

      for (const r of results) {
        const fileId = filenameToFileId.get(r.filename);
        if (!fileId) continue;

        if (r.status === 'ok' || r.ok) {
          if (r.extract) {
            dispatch({
              type: 'EXTRACT/RESULT_OK',
              file_id: fileId,
              extract: normalizeExtract(r),
              extracted_at: new Date().toISOString(),
            });
          } else {
            dispatch({
              type: 'EXTRACT/RESULT_ERR',
              file_id: fileId,
              error: {
                code: 'extract_missing_payload',
                message: 'Extraction payload missing.',
                error_id: null,
              },
            });
          }
        } else {
          dispatch({
            type: 'EXTRACT/RESULT_ERR',
            file_id: fileId,
            error: {
              code: r.error?.code || 'extract_failed',
              message: r.error?.message || 'Extraction failed',
              error_id: null,
            },
          });
        }
      }
    } catch (e) {
      const err = toUiError(e);
      dispatch({
        type: 'BULK/SET_BANNER_ERROR',
        message: `Extract failed (${err.code}): ${err.message}${err.error_id ? ` [error_id: ${err.error_id}]` : ''}`,
      });
    } finally {
      dispatch({ type: 'EXTRACT/FINISH' });
    }
  }, [dispatch, state.items, state.batch_id]);

  const createDraftForSelected = useCallback(async (file_id: string) => {
    const item = state.items.find((x) => x.file_id === file_id) ?? null;
    if (item?.created_contract_id) {
      try {
        const tracksResp = await contractsBulkClient.batchSetTracks(item.created_contract_id, {
          confirm_non_destructive: true,
          track_ids: item.selected_track_ids || [],
        });
        const partiesResp = await contractsBulkClient.batchSetParties(item.created_contract_id, {
          confirm_non_destructive: true,
          items: (item.parties || []).map((p: any) => ({
            role: p.role || 'other',
            entity_type: p.entity_type,
            entity_id: p.entity_id,
            split_percent: p.split_percent ?? null,
            notes: p.notes ?? null,
          })),
        });
        dispatch({
          type: 'DRAFT/SUCCESS',
          file_id,
          created_contract_id: Number(item.created_contract_id),
          created_document_id: Number(item.created_document_id || 0),
          linked_tracks_count: Number(tracksResp?.linked_tracks_count ?? item.selected_track_ids?.length ?? 0),
          completeness: normalizeCompleteness(partiesResp?.completeness ? partiesResp : tracksResp),
          created_at: item.created_at || new Date().toISOString(),
        });
        dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: 'Draft mappings updated successfully.' });
      } catch (e) {
        dispatch({ type: 'DRAFT/ERROR', file_id, error: toUiError(e) });
      }
      return;
    }
    const missing: string[] = [];
    if (!item?.extract || item.extract.version !== 'v2') missing.push('run extract');
    if (!item?.confirm_non_destructive) missing.push('confirm non-destructive');
    if (missing.length > 0) {
      dispatch({
        type: 'BULK/SET_BANNER_ERROR',
        message: `Cannot create draft: ${missing.join(', ')}`,
      });
      return;
    }
    if (!item?.file || !item.extract) return;

    dispatch({ type: 'DRAFT/START', file_id });

    try {
      const payload = {
        confirm_non_destructive: true,
        idempotency_key: `sha256:${state.batch_id || 'batch'}:${item.filename}`,
        extract: {
          version: 'v2',
          data: item.extract?.data || {},
        },
        track_ids: item.selected_track_ids,
        create_parties: Boolean(item.parties?.length),
        party_links: (item.parties || []).map((p: any) => ({
          role: p.role || 'other',
          entity_type: p.entity_type || 'external',
          entity_id: p.entity_id ?? null,
          external_name: p.external_name || (!p.entity_id ? p.display_name : null),
          split_percent: p.split_percent ?? null,
          notes: p.notes ?? null,
        })),
      };

      const form = new FormData();
      form.append('payload', JSON.stringify(payload));
      form.append('file', item.file, item.filename);

      const resp = await contractsBulkClient.createFromExtract(form);
      const contractId = Number(resp?.contract?.id ?? resp?.contract_id);
      if (!Number.isFinite(contractId) || contractId <= 0) {
        throw new Error('Create returned no contract_id');
      }

      dispatch({
        type: 'DRAFT/SUCCESS',
        file_id,
        created_contract_id: contractId,
        created_document_id: Number(resp?.document?.id ?? resp?.contract_document_id ?? 0),
        linked_tracks_count: Number(resp?.linked_tracks_count ?? resp?.links?.tracks_linked ?? 0),
        completeness: normalizeCompleteness(resp),
        created_at: new Date().toISOString(),
      });
      if (contractId) {
        const tracksResp = await contractsBulkClient.batchSetTracks(contractId, {
          confirm_non_destructive: true,
          track_ids: item.selected_track_ids || [],
        });
        const partiesResp = await contractsBulkClient.batchSetParties(contractId, {
          confirm_non_destructive: true,
          items: (item.parties || []).map((p: any) => ({
            role: p.role || 'other',
            entity_type: p.entity_type,
            entity_id: p.entity_id,
            split_percent: p.split_percent ?? null,
            notes: p.notes ?? null,
          })),
        });
        dispatch({
          type: 'DRAFT/SUCCESS',
          file_id,
          created_contract_id: contractId,
          created_document_id: Number(resp?.document?.id ?? resp?.contract_document_id ?? 0),
          linked_tracks_count: Number(tracksResp?.linked_tracks_count ?? resp?.linked_tracks_count ?? 0),
          completeness: normalizeCompleteness(partiesResp?.completeness ? partiesResp : tracksResp),
          created_at: new Date().toISOString(),
        });
      }
      dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: 'Draft created successfully.' });
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: null });
    } catch (e) {
      const err = toUiError(e);
      dispatch({ type: 'DRAFT/ERROR', file_id, error: err });
      dispatch({
        type: 'BULK/SET_BANNER_ERROR',
        message: `Create failed (${err.code}): ${err.message}${err.error_id ? ` [error_id: ${err.error_id}]` : ''}`,
      });
    }
  }, [dispatch, state.items, state.batch_id]);

  const savePartiesForSelected = useCallback(async (file_id: string) => {
    const item = state.items.find((x) => x.file_id === file_id) ?? null;
    const gate = canSaveParties(item);
    if (!gate.ok) {
      dispatch({
        type: 'BULK/SET_BANNER_ERROR',
        message: `Cannot save parties: ${gate.missing.join(', ')}`,
      });
      return;
    }
    if (!item?.created_contract_id) return;

    dispatch({ type: 'PARTIES/START', file_id });

    try {
      const normalizedParties = (item.parties || [])
        .filter((p: any) => p.entity_id && p.entity_type)
        .map((p: any) => ({
          role: p.role || 'other',
          entity_type: p.entity_type,
          entity_id: Number(p.entity_id),
          split_percent: p.split_percent ?? null,
          notes: p.notes ?? null,
        }));
      const resp = await contractsBulkClient.batchSetParties(item.created_contract_id, {
        confirm_non_destructive: true,
        items: normalizedParties,
      });

      dispatch({
        type: 'PARTIES/SUCCESS',
        file_id,
        saved_count: Number(resp?.updated_count ?? 0),
        completeness: normalizeCompleteness(resp),
      });
      dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: 'Parties saved successfully.' });
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: null });
    } catch (e) {
      dispatch({ type: 'PARTIES/ERROR', file_id, error: toUiError(e) });
    }
  }, [dispatch, state.items]);

  const saveTracksForSelected = useCallback(async (file_id: string) => {
    const item = state.items.find((x) => x.file_id === file_id) ?? null;
    if (!item?.created_contract_id) {
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: 'Cannot save tracks: create draft first' });
      return;
    }
    try {
      const resp = await contractsBulkClient.batchSetTracks(item.created_contract_id, {
        confirm_non_destructive: true,
        track_ids: item.selected_track_ids || [],
      });
      dispatch({
        type: 'DRAFT/SUCCESS',
        file_id,
        created_contract_id: item.created_contract_id,
        created_document_id: Number(item.created_document_id || 0),
        linked_tracks_count: Number(resp?.linked_tracks_count ?? item.selected_track_ids?.length ?? 0),
        completeness: normalizeCompleteness(resp),
        created_at: item.created_at || new Date().toISOString(),
      });
      dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: 'Tracks saved successfully.' });
    } catch (e) {
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: toUiError(e).message });
    }
  }, [dispatch, state.items]);

  const createDraftForBatch = useCallback(async (file_ids: string[]) => {
    for (const fileId of file_ids) {
      // eslint-disable-next-line no-await-in-loop
      await createDraftForSelected(fileId);
    }
  }, [createDraftForSelected]);

  const savePartiesForBatch = useCallback(async (file_ids: string[]) => {
    for (const fileId of file_ids) {
      // eslint-disable-next-line no-await-in-loop
      await savePartiesForSelected(fileId);
    }
  }, [savePartiesForSelected]);

  const autoMatchTracks = useCallback(async (file_id: string) => {
    const item = state.items.find((x) => x.file_id === file_id);
    if (!item?.extract) return;

    const payload = {
      contract_extract_v2: {
        ...(item.extract?.data || {}),
        contract_title: item.extract?.data?.title || null,
      },
      track_ids_hint: item.selected_track_ids || [],
      max_results: 20,
    };

    const mapPlan = await contractsBulkClient.trackMapPlan(payload);
    const suggestedTrackIds = (mapPlan?.candidates || [])
      .map((c: any) => c?.matches?.[0]?.track?.id)
      .filter(Boolean)
      .map(Number);

    const merged = Array.from(new Set([...(item.selected_track_ids || []), ...suggestedTrackIds]));
    dispatch({ type: 'ITEM/SET_TRACKS', file_id, track_ids: merged });
  }, [dispatch, state.items]);

  return {
    addFiles,
    runBulkExtract,
    createDraftForSelected,
    createDraftForBatch,
    savePartiesForSelected,
    saveTracksForSelected,
    savePartiesForBatch,
    autoMatchTracks,
    searchTracks: contractsBulkClient.searchTracks,
    searchParties: contractsBulkClient.searchParties,
    createPartyInline: contractsBulkClient.createPartyInline,
  };
}
