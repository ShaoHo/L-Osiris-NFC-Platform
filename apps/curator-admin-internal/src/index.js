#!/usr/bin/env node

const BASE_URL = process.env.INTERNAL_ADMIN_API_URL ?? 'http://localhost:3000';

const args = process.argv.slice(2);
const [command, ...rest] = args;

const flags = parseFlags(rest);

if (!command || flags.help) {
  printHelp();
  process.exit(0);
}

const otp = flags.otp ?? process.env.INTERNAL_ADMIN_OTP;

if (!otp) {
  console.error('Missing OTP. Provide --otp or set INTERNAL_ADMIN_OTP.');
  process.exit(1);
}

const requestedBy = flags.requestedBy;

if (!requestedBy) {
  console.error('Missing --requestedBy.');
  process.exit(1);
}

const handlers = {
  'suspend-curator': () =>
    requestInternal(
      `/internal/admin/curators/${requireFlag('curatorId')}/suspend`,
      {
        requestedBy,
        reason: flags.reason ?? null,
      },
      otp,
    ),
  'unsuspend-curator': () =>
    requestInternal(
      `/internal/admin/curators/${requireFlag('curatorId')}/unsuspend`,
      {
        requestedBy,
      },
      otp,
    ),
  'transfer-exhibition': () =>
    requestInternal(
      `/internal/admin/exhibitions/${requireFlag('exhibitionId')}/transfer`,
      {
        requestedBy,
        toCuratorId: requireFlag('toCuratorId'),
        reason: flags.reason ?? null,
      },
      otp,
    ),
};

const handler = handlers[command];

if (!handler) {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

handler()
  .then((payload) => {
    console.log(JSON.stringify(payload, null, 2));
  })
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  });

function parseFlags(items) {
  const output = {};

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item.startsWith('--')) {
      const key = item.slice(2);
      const value = items[index + 1];
      output[key] = value && !value.startsWith('--') ? value : true;
      if (value && !value.startsWith('--')) {
        index += 1;
      }
    }
  }

  return output;
}

function printHelp() {
  console.log(`Internal admin CLI

Usage:
  suspend-curator --curatorId <id> --requestedBy <email> [--reason <text>] [--otp <code>]
  unsuspend-curator --curatorId <id> --requestedBy <email> [--otp <code>]
  transfer-exhibition --exhibitionId <id> --toCuratorId <id> --requestedBy <email> [--reason <text>] [--otp <code>]

Environment:
  INTERNAL_ADMIN_API_URL (default: http://localhost:3000)
  INTERNAL_ADMIN_OTP
`);
}

function requireFlag(name) {
  const value = flags[name];

  if (!value || value === true) {
    console.error(`Missing --${name}.`);
    process.exit(1);
  }

  return value;
}

async function requestInternal(path, body, otpValue) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-otp': otpValue,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed: ${response.status} ${text}`);
  }

  return response.json();
}
