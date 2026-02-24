#!/usr/bin/env bash
set -euo pipefail

if [ -z "${CORE_REPO_PAT:-}" ]; then
  echo "Error: CORE_REPO_PAT is not set."
  exit 1
fi

git config --global url."https://${CORE_REPO_PAT}@github.com/".insteadOf "https://github.com/"
git submodule sync
git submodule update --init --recursive

echo "Core submodule initialized."
