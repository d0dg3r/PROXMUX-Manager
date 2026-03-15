#!/usr/bin/env bash
set -euo pipefail
umask 077

echo "PROXMUX Proxmox Token Setup Helper"
echo

if ! command -v pveum >/dev/null 2>&1; then
  echo "Error: pveum not found. Run this on a Proxmox VE host."
  exit 1
fi

read -r -p "Use existing API user? [y/N]: " use_existing
use_existing="${use_existing:-N}"

if [[ "$use_existing" =~ ^[Yy]$ ]]; then
  read -r -p "Enter existing user (example: api-admin@pve): " user_realm
else
  read -r -p "Enter new user (example: api-admin@pve): " user_realm
  read -r -s -p "Enter password for ${user_realm}: " user_password
  echo
  pveum user add "${user_realm}" --password "${user_password}"
fi

read -r -p "ACL role to assign [Administrator]: " role_name
role_name="${role_name:-Administrator}"

read -r -p "ACL path to assign [/]:" acl_path
acl_path="${acl_path:-/}"

echo "Assigning ACL: role=${role_name}, path=${acl_path}, user=${user_realm}"
pveum acl modify "${acl_path}" --user "${user_realm}" --role "${role_name}"

read -r -p "Token ID [full-access]: " token_id
token_id="${token_id:-full-access}"

read -r -p "Disable privilege separation (--privsep 0)? [Y/n]: " use_no_privsep
use_no_privsep="${use_no_privsep:-Y}"

echo
if [[ "$use_no_privsep" =~ ^[Nn]$ ]]; then
  echo "Creating token with privilege separation enabled (default)."
  token_output="$(pveum user token add "${user_realm}" "${token_id}")"
else
  echo "Creating token with --privsep 0 (inherits full user ACL rights)."
  token_output="$(pveum user token add "${user_realm}" "${token_id}" --privsep 0)"
fi

extract_token_secret() {
  local raw="$1"
  local parsed=""

  # Common pveum output pattern: "value <secret>"
  parsed="$(printf '%s\n' "$raw" | sed -nE 's/.*[Vv]alue[[:space:]]+([^[:space:]]+).*/\1/p' | head -n1 || true)"
  if [[ -z "$parsed" ]]; then
    # Fallback pattern: "secret: <secret>"
    parsed="$(printf '%s\n' "$raw" | sed -nE 's/.*[Ss]ecret[:[:space:]]+([^[:space:]]+).*/\1/p' | head -n1 || true)"
  fi

  printf '%s' "$parsed"
}

safe_name() {
  printf '%s' "$1" | tr '@:/ ' '____' | tr -cd 'A-Za-z0-9._-'
}

token_secret="$(extract_token_secret "${token_output}")"
host_name="$(hostname -s 2>/dev/null || hostname || echo 'unknown-host')"
timestamp="$(date +%Y%m%d-%H%M%S)"
safe_user="$(safe_name "${user_realm}")"
safe_token_id="$(safe_name "${token_id}")"
safe_host="$(safe_name "${host_name}")"
secret_file="proxmox-token-${safe_user}-${safe_token_id}-${safe_host}-${timestamp}.txt"
secret_path="${PWD}/${secret_file}"

read -r -p "Write token record file to disk? [Y/n]: " write_secret_file
write_secret_file="${write_secret_file:-Y}"

if [[ "$write_secret_file" =~ ^[Nn]$ ]]; then
  echo
  echo "Disk write skipped by choice."
  echo "IMPORTANT: Import the token secret into your password manager now."
  echo "Do not leave the secret in terminal history or screenshots."
else
  cat > "${secret_path}" <<EOF
PROXMOX TOKEN RECORD
created_at=${timestamp}
host=${host_name}
user_realm=${user_realm}
token_id=${token_id}
token_secret=${token_secret:-<not-parsed-see_raw_output>}
authorization_header=Authorization: PVEAPIToken=${user_realm}!${token_id}=${token_secret:-TOKEN_SECRET}

raw_token_output:
${token_output}
EOF
  chmod 600 "${secret_path}"
fi

echo
echo "Token created. Proxmox returns the secret only once."
if [[ "$write_secret_file" =~ ^[Nn]$ ]]; then
  echo "No local token file was created."
else
  echo "A unique token record file was written:"
  echo "  ${secret_path}"
  echo "File mode:"
  ls -l "${secret_path}" | awk '{print "  " $1 " " $9}'
  echo
  echo "IMPORTANT: Import the secret into your password manager now."
  echo "After successful import, delete the file from disk."
  if command -v shred >/dev/null 2>&1; then
    echo "Preferred delete command: shred -u '${secret_path}'"
  else
    echo "Delete command: rm '${secret_path}'"
  fi
fi
echo
echo "${token_output}"
echo
echo "Use these values in PROXMUX:"
echo "  User & Realm: ${user_realm}"
echo "  Token ID: ${token_id}"
echo "  API Secret: <value from output above>"
echo
cat <<EOF
zsh-safe Authorization header example:
  'Authorization: PVEAPIToken=${user_realm}!${token_id}=${token_secret:-TOKEN_SECRET}'

Test commands:
  curl -k -s -H 'Authorization: PVEAPIToken=${user_realm}!${token_id}=${token_secret:-TOKEN_SECRET}' 'https://YOUR_HOST:8006/api2/json/cluster/resources'
  curl -k -s -H 'Authorization: PVEAPIToken=${user_realm}!${token_id}=${token_secret:-TOKEN_SECRET}' 'https://YOUR_HOST:8006/api2/json/nodes/pve-node-name/status'
EOF
