# Contracts UI Regression Checklist

- [ ] Sidebar shows “Contracts” nav item routing to `/contracts`; no legacy items remain.
- [ ] `/contracts` list: filters (status/type/expiring) and search work client-side; row click opens detail.
- [ ] New contract creation modal creates CTR and navigates to detail.
- [ ] `/contracts/:id` detail: tabs switch without losing state; metadata edit saves via `/api/contracts/:id`.
- [ ] Parties tab: add system entity (typeahead) and external party; duplicate protection; remove party works.
- [ ] Assets tab: add multiple assets in one submit; scope preserved; remove asset works.
- [ ] Terms & Splits tab: add split group, add/remove splits, totals render.
- [ ] Financials tab: modal saves royalty/advances/recoupment.
- [ ] Documents tab: file upload (via `/api/contracts/:id/documents`), preview opens inline, download works; primary badge shows newest version; make primary gracefully handles missing endpoint.
- [ ] Audit tab renders read-only placeholder (no crashes).
- [ ] Dark-mode/global theme toggle (if enabled) keeps legibility; orange CTAs remain visible.
