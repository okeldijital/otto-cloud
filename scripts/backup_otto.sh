#!/usr/bin/env bash
set -euo pipefail

timestamp=$(date +"%Y%m%d_%H%M%S")
base_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

storage_dir="${base_dir}/storage"
db_src="${storage_dir}/app.db"
contracts_src="${storage_dir}/contracts"

# Fallback to legacy locations if storage/app.db is not present
if [[ ! -f "${db_src}" && -f "${base_dir}/otto.db" ]]; then
  db_src="${base_dir}/otto.db"
fi

backup_dir="${storage_dir}/backups/${timestamp}"
mkdir -p "${backup_dir}"

if [[ -f "${db_src}" ]]; then
  cp "${db_src}" "${backup_dir}/app.db"
  echo "Database backup saved to ${backup_dir}/app.db"
else
  echo "Warning: database file not found at ${db_src}" >&2
fi

if [[ -d "${contracts_src}" ]]; then
  cp -a "${contracts_src}" "${backup_dir}/contracts"
  echo "Contracts files copied to ${backup_dir}/contracts"
else
  echo "Warning: contracts storage not found at ${contracts_src}" >&2
fi

echo "Backup completed at ${backup_dir}"
