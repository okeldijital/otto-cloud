#!/bin/bash
# Script to run backend in desktop mode for development

export APP_ENV=desktop
export AUTH_DISABLED=true

cd "$(dirname "$0")/../backend"
source ../.venv/bin/activate
python main.py
