import { useCallback } from 'react';
import type { BulkBatchState } from './types';
import type { BulkAction } from './bulkReducer';
import { canCreateDraft, canSaveParties } from './bulkReducer';
import contractsBulkClient from '../../../api/contractsBulkClient';
import contractsPartiesClient from '../../../api/contractsPartiesClient';

function stableUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toUiError(e: any) {
  const status = e?.response?.status;
  const data = e?.response?.data;

  const error_id = data?.error_id ?? null;
  const detail = data?.detail ?? data?.message ?? 'Request failed';

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

    dispatch({ type: 'EXTRACT/START', file_ids });

    try {
      const form = new FormData();
      if (state.batch_id) form.append('batch_id', state.batch_id);
      form.append('tracks_only', 'true');
      form.append('options', JSON.stringify({ mode: 'tracks_only', extract_version: 'v2', llm_mode: 'hybrid_conservative', max_files: 50 }));

      for (const it of items) {
        if (it.file) form.append('files', it.file, it.filename);
      }

      const resp = await contractsBulkClient.extractBulk(form);
      const results = Array.isArray(resp?.results) ? resp.results : [];
      const byKey = new Map<string, any>();
      for (const r of results) {
        if (r?.file_id) byKey.set(r.file_id, r);
        if (r?.filename) byKey.set(r.filename, r);
        if (r?.client_file_id) byKey.set(r.client_file_id, r);
      }

      for (const it of items) {
        const r = byKey.get(it.file_id) || byKey.get(it.filename);
        if (!r) {
          dispatch({
            type: 'EXTRACT/RESULT_ERR',
            file_id: it.file_id,
            error: {
              code: 'extract_missing_result',
              message: 'No extraction result returned for this file.',
              error_id: null,
            },
          });
          continue;
        }

        if (r.ok || r.status === 'ok') {
          const extract = normalizeExtract(r);
          if (extract) {
            dispatch({
              type: 'EXTRACT/RESULT_OK',
              file_id: it.file_id,
              extract,
              extracted_at: new Date().toISOString(),
            });
          } else {
            dispatch({
              type: 'EXTRACT/RESULT_ERR',
              file_id: it.file_id,
              error: {
                code: 'extract_missing_payload',
                message: 'Extraction payload missing in response.',
                error_id: null,
              },
            });
          }
        } else {
          dispatch({
            type: 'EXTRACT/RESULT_ERR',
            file_id: it.file_id,
            error: {
              code: r?.error?.code || 'extract_failed',
              message: r?.error?.message || 'Extraction failed',
              error_id: r?.error?.error_id ?? null,
            },
          });
        }
      }
    } catch (e) {
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: toUiError(e).message });
    } finally {
      dispatch({ type: 'EXTRACT/FINISH' });
    }
  }, [dispatch, state.items, state.batch_id]);

  const createDraftForSelected = useCallback(async (file_id: string) => {
    const item = state.items.find((x) => x.file_id === file_id) ?? null;
    const gate = canCreateDraft(item);
    if (!gate.ok) {
      dispatch({
        type: 'BULK/SET_BANNER_ERROR',
        message: `Cannot create draft: ${gate.missing.join(', ')}`,
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
        create_parties: false,
      };

      const form = new FormData();
      form.append('payload', JSON.stringify(payload));
      form.append('file', item.file, item.filename);

      const resp = await contractsBulkClient.createFromExtract(form);

      dispatch({
        type: 'DRAFT/SUCCESS',
        file_id,
        created_contract_id: Number(resp?.contract?.id ?? resp?.contract_id),
        created_document_id: Number(resp?.document?.id ?? resp?.contract_document_id ?? 0),
        linked_tracks_count: Number(resp?.linked_tracks_count ?? resp?.links?.tracks_linked ?? 0),
        completeness: normalizeCompleteness(resp),
        created_at: new Date().toISOString(),
      });
      dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: 'Draft created successfully.' });
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: null });
    } catch (e) {
      dispatch({ type: 'DRAFT/ERROR', file_id, error: toUiError(e) });
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
      const normalizedParties = (item.parties || []).map((p) => ({
        role: p.role,
        entity_type: p.entity_type || (p.source === 'external_party' ? 'external' : p.party_ref?.ref_type || 'external'),
        entity_id: p.entity_id ?? p.party_ref?.ref_id ?? null,
        display_name: p.display_name || p.external_name || p.party_ref?.display_name || '',
        split_percent: p.split_percent ?? p.split?.percent ?? null,
        notes: p.notes ?? p.split?.scope ?? null,
      }));
      const resp = await contractsPartiesClient.save({
        contract_id: item.created_contract_id,
        parties: normalizedParties,
      });

      dispatch({
        type: 'PARTIES/SUCCESS',
        file_id,
        saved_count: Number(resp?.saved_count ?? 0),
        completeness: normalizeCompleteness(resp),
      });
      dispatch({ type: 'BULK/SET_BANNER_NOTICE', message: 'Parties saved successfully.' });
      dispatch({ type: 'BULK/SET_BANNER_ERROR', message: null });
    } catch (e) {
      dispatch({ type: 'PARTIES/ERROR', file_id, error: toUiError(e) });
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
    savePartiesForBatch,
    autoMatchTracks,
    searchTracks: contractsBulkClient.searchTracks,
    searchParties: contractsBulkClient.searchParties,
    createPartyInline: contractsBulkClient.createPartyInline,
  };
}
