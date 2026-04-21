import type { PolicyPreset, PolicyRule, PolicyCategory } from "./types.js";

const DENY_SHELL_DANGER: PolicyRule = {
  toolPattern: "shell.danger.*",
  action: "deny",
  priority: 100,
};

const DENY_SHELL_ADMIN: PolicyRule = {
  toolPattern: "shell.admin.*",
  action: "deny",
  priority: 90,
};

const DENY_DB_DANGER: PolicyRule = {
  toolPattern: "db.danger.*",
  action: "deny",
  priority: 80,
};

const DENY_FILE_DELETE: PolicyRule = {
  toolPattern: "file.delete",
  action: "deny",
  priority: 70,
};

const DENY_ENV_FILE: PolicyRule = {
  toolPattern: "file.read[.env]",
  action: "deny",
  priority: 60,
  // Cover every common .env variant: `.env` itself plus `.env.local`,
  // `.env.production`, `.env.staging`, `.env.test`, etc. Path-pattern is
  // glob-matched against params.file_path on the server.
  conditions: { path_pattern: [".env", ".env.*"] },
};

const DENY_PEM_FILE: PolicyRule = {
  toolPattern: "file.read[*.pem]",
  action: "deny",
  priority: 60,
  conditions: { path_pattern: "*.pem" },
};

const DENY_KEY_FILE: PolicyRule = {
  toolPattern: "file.read[*.key]",
  action: "deny",
  priority: 60,
  conditions: { path_pattern: "*.key" },
};

const DENY_PFX_FILE: PolicyRule = {
  toolPattern: "file.read[*.pfx]",
  action: "deny",
  priority: 60,
  // Windows-style cert bundles. Usually contain a private key alongside the
  // cert chain, so belong in the same sensitivity class as .pem/.key.
  conditions: { path_pattern: ["*.pfx", "*.p12"] },
};

const DENY_SSH_KEY: PolicyRule = {
  toolPattern: "file.read[ssh_key]",
  action: "deny",
  priority: 60,
  // The classifier emits `file.read[ssh_key]` for the canonical SSH
  // private-key filenames. Conditions narrow to those exact basenames so
  // public keys (`id_rsa.pub` etc.) — which are safe to expose — still
  // fall through to the `*` allow.
  conditions: { path_pattern: ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"] },
};

const DENY_SECRETS_FILE: PolicyRule = {
  toolPattern: "file.read[.secrets]",
  action: "deny",
  priority: 60,
  // `.secrets` or `secrets` as a filename (common dotfile convention for
  // per-project credential storage: dotenv-cli, shell profiles, etc.).
  conditions: { path_pattern: [".secrets", "secrets"] },
};

const DENY_CREDENTIALS_FILE: PolicyRule = {
  toolPattern: "file.read[credentials]",
  action: "deny",
  priority: 60,
  // AWS-style `credentials` (`~/.aws/credentials`), GCP's
  // `application_default_credentials.json`, and any `*.credentials` file.
  conditions: {
    path_pattern: [
      "credentials",
      "application_default_credentials.json",
      "*.credentials",
    ],
  },
};

const DENY_TOKEN_FILE: PolicyRule = {
  toolPattern: "file.read[*.token]",
  action: "deny",
  priority: 60,
  // Any file with a `.token` suffix — bearer tokens, API tokens, etc.
  conditions: { path_pattern: "*.token" },
};

const ALLOW_ALL: PolicyRule = {
  toolPattern: "*",
  action: "allow",
  priority: 0,
};

const categories: readonly PolicyCategory[] = [
  {
    name: "filesystem",
    label: "Filesystem",
    toggles: [
      {
        id: "filesystem.delete",
        label: "Block file deletion",
        description: "Prevents agents from deleting files",
        defaultOn: true,
        rules: [DENY_FILE_DELETE],
      },
      {
        id: "filesystem.write",
        label: "Allow file writes",
        description: "Permits agents to write and modify files",
        defaultOn: true,
        rules: [],
      },
    ],
  },
  {
    name: "credentials",
    label: "Credentials",
    toggles: [
      {
        id: "credentials.env",
        label: "Block .env access",
        description: "Prevents agents from reading .env files",
        defaultOn: true,
        rules: [DENY_ENV_FILE],
      },
      {
        id: "credentials.pem",
        label: "Block certificate access",
        description: "Prevents agents from reading .pem, .key, .pfx, and .p12 files",
        defaultOn: true,
        rules: [DENY_PEM_FILE, DENY_KEY_FILE, DENY_PFX_FILE],
      },
      {
        id: "credentials.ssh",
        label: "Block SSH private key access",
        description: "Prevents agents from reading id_rsa / id_ed25519 / id_ecdsa / id_dsa",
        defaultOn: true,
        rules: [DENY_SSH_KEY],
      },
      {
        id: "credentials.secrets",
        label: "Block generic secrets files",
        description: "Prevents agents from reading `.secrets` / `secrets`, `credentials` (AWS/GCP style), and `*.token` files",
        defaultOn: true,
        rules: [DENY_SECRETS_FILE, DENY_CREDENTIALS_FILE, DENY_TOKEN_FILE],
      },
    ],
  },
  {
    name: "shell",
    label: "Shell",
    toggles: [
      {
        id: "shell.danger",
        label: "Block dangerous shell commands",
        description: "Prevents agents from running destructive shell operations",
        defaultOn: true,
        rules: [DENY_SHELL_DANGER],
      },
      {
        id: "shell.admin",
        label: "Block admin shell commands",
        description: "Prevents agents from running privileged shell operations",
        defaultOn: true,
        rules: [DENY_SHELL_ADMIN],
      },
    ],
  },
  {
    name: "network",
    label: "Network",
    toggles: [
      {
        id: "network.unrestricted",
        label: "Allow unrestricted network access",
        description: "Permits agents to make any network request",
        defaultOn: true,
        rules: [],
      },
    ],
  },
  {
    name: "database",
    label: "Database",
    toggles: [
      {
        id: "database.danger",
        label: "Block dangerous database operations",
        description: "Prevents agents from running destructive database queries",
        defaultOn: true,
        rules: [DENY_DB_DANGER],
      },
    ],
  },
];

export const developerPreset: PolicyPreset = {
  name: "Developer",
  description:
    "Optimized for developer productivity. Allows most operations while blocking dangerous shell commands, admin operations, destructive database queries, file deletion, and access to credential files.",
  rules: [
    DENY_SHELL_DANGER,
    DENY_SHELL_ADMIN,
    DENY_DB_DANGER,
    DENY_FILE_DELETE,
    DENY_ENV_FILE,
    DENY_PEM_FILE,
    DENY_KEY_FILE,
    DENY_PFX_FILE,
    DENY_SSH_KEY,
    DENY_SECRETS_FILE,
    DENY_CREDENTIALS_FILE,
    DENY_TOKEN_FILE,
    ALLOW_ALL,
  ],
  categories,
};
