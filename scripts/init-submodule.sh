#!/bin/bash
set -eu

# Detect environment: Vercel sets the VERCEL=1 env var automatically
if [ "${VERCEL:-}" = "1" ]; then
  echo "[submodule] Vercel CI detected — setting up SSH deploy key..."

  if [ -z "${SALEOR_ADVANCE_SSH_PRIVATE_KEY_BASE64:-}" ]; then
    echo "[submodule] ERROR: SALEOR_ADVANCE_SSH_PRIVATE_KEY_BASE64 env var is not set." >&2
    exit 1
  fi

  mkdir -p ~/.ssh
  # Decode the Base64 key
  echo "$SALEOR_ADVANCE_SSH_PRIVATE_KEY_BASE64" | base64 --decode > ~/.ssh/id_ed25519
  chmod 600 ~/.ssh/id_ed25519

  # Force Git to use this specific key and disable the interactive known_hosts prompt
  export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no"

  echo "[submodule] SSH deploy key configured."
else
  echo "[submodule] Local environment detected — using existing SSH agent."
fi

# Initialize and update submodules
git submodule update --init --recursive
echo "[submodule] Submodules initialized successfully."
