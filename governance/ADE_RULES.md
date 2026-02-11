# ADE Rules (Governance)

1.  **No Drift**: Do not add new folders, files, or dependencies unless explicitly authorized.
2.  **No New Folders / No Silent Refactors**: Maintain the existing directory structure.
3.  **No New DB Locations / No New Storage Roots**: Use the canonical SQLite DB path only.
4.  **Must Run Governance**: Always run `scripts/run_governance.sh` before committing or requesting review.
5.  **Must Set OTTO_CHANGE_SCOPE**: Environment variable `OTTO_CHANGE_SCOPE` must be set to the active scope (e.g., `contracts`, `installer`, `governance`).
6.  **Regression Checks**: If you change module A, you must add/update a regression check so module B doesn't break.
