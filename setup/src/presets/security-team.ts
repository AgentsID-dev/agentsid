import type { PolicyPreset, PolicyRule, PolicyCategory } from "./types.js";

// Deny rules — ordered by descending priority
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

const DENY_SHELL_WRITE: PolicyRule = {
  toolPattern: "shell.write.*",
  action: "deny",
  priority: 90,
};

const DENY_DB_DANGER: PolicyRule = {
  toolPattern: "db.danger.*",
  action: "deny",
  priority: 80,
};

const DENY_DB_WRITE: PolicyRule = {
  toolPattern: "db.write.*",
  action: "deny",
  priority: 80,
};

const DENY_FILE_DELETE: PolicyRule = {
  toolPattern: "file.delete",
  action: "deny",
  priority: 70,
};

const DENY_NETWORK_WRITE: PolicyRule = {
  toolPattern: "network.write.*",
  action: "deny",
  priority: 70,
};

const DENY_HTTP_POST: PolicyRule = {
  toolPattern: "http.post",
  action: "deny",
  priority: 70,
};

const DENY_HTTP_PUT: PolicyRule = {
  toolPattern: "http.put",
  action: "deny",
  priority: 70,
};

const DENY_HTTP_DELETE: PolicyRule = {
  toolPattern: "http.delete",
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
  // Classifier emits `file.read[ssh_key]` for the canonical SSH private-key
  // filenames. Public keys (`id_rsa.pub` etc.) aren't classified, so they
  // fall through to the existing allow rules.
  conditions: { path_pattern: ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"] },
};

const DENY_SECRETS_FILE: PolicyRule = {
  toolPattern: "file.read[.secrets]",
  action: "deny",
  priority: 60,
  conditions: { path_pattern: [".secrets", "secrets"] },
};

const DENY_CREDENTIALS_FILE: PolicyRule = {
  toolPattern: "file.read[credentials]",
  action: "deny",
  priority: 60,
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
  conditions: { path_pattern: "*.token" },
};

// Allow rules with approval or unrestricted
const ALLOW_FILE_WRITE_APPROVAL: PolicyRule = {
  toolPattern: "file.write",
  action: "allow",
  priority: 40,
  requiresApproval: true,
};

const ALLOW_SHELL_WRITE_APPROVAL: PolicyRule = {
  toolPattern: "shell.write.*",
  action: "allow",
  priority: 35,
  requiresApproval: true,
};

const ALLOW_SHELL_READ: PolicyRule = {
  toolPattern: "shell.read.*",
  action: "allow",
  priority: 30,
};

const ALLOW_FILE_READ: PolicyRule = {
  toolPattern: "file.read",
  action: "allow",
  priority: 25,
};

const ALLOW_FILE_LIST: PolicyRule = {
  toolPattern: "file.list",
  action: "allow",
  priority: 25,
};

const ALLOW_FILE_INFO: PolicyRule = {
  toolPattern: "file.info",
  action: "allow",
  priority: 25,
};

const ALLOW_GIT_READ: PolicyRule = {
  toolPattern: "git.read.*",
  action: "allow",
  priority: 25,
};

const ALLOW_DB_READ: PolicyRule = {
  toolPattern: "db.read",
  action: "allow",
  priority: 25,
};

const ALLOW_HTTP_GET: PolicyRule = {
  toolPattern: "http.get",
  action: "allow",
  priority: 20,
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
        label: "Require approval for file writes",
        description: "File write operations require explicit human approval",
        defaultOn: true,
        rules: [ALLOW_FILE_WRITE_APPROVAL],
      },
      {
        id: "filesystem.read",
        label: "Allow file reads",
        description: "Permits agents to read files (except credentials)",
        defaultOn: true,
        rules: [ALLOW_FILE_READ, ALLOW_FILE_LIST, ALLOW_FILE_INFO],
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
      {
        id: "shell.write",
        label: "Restrict shell write operations",
        description: "Shell write operations require approval; only reads are freely allowed",
        defaultOn: true,
        rules: [DENY_SHELL_WRITE, ALLOW_SHELL_WRITE_APPROVAL, ALLOW_SHELL_READ],
      },
    ],
  },
  {
    name: "network",
    label: "Network",
    toggles: [
      {
        id: "network.write",
        label: "Block network write operations",
        description: "Prevents agents from making POST, PUT, DELETE HTTP requests",
        defaultOn: true,
        rules: [DENY_NETWORK_WRITE, DENY_HTTP_POST, DENY_HTTP_PUT, DENY_HTTP_DELETE],
      },
      {
        id: "network.read",
        label: "Allow HTTP GET",
        description: "Permits agents to make read-only HTTP requests",
        defaultOn: true,
        rules: [ALLOW_HTTP_GET],
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
      {
        id: "database.write",
        label: "Block database write operations",
        description: "Prevents agents from inserting, updating, or deleting database records",
        defaultOn: true,
        rules: [DENY_DB_WRITE],
      },
      {
        id: "database.read",
        label: "Allow database reads",
        description: "Permits agents to query the database in read-only mode",
        defaultOn: true,
        rules: [ALLOW_DB_READ],
      },
    ],
  },
];

export const securityTeamPreset: PolicyPreset = {
  name: "Security Team",
  description:
    "Strict preset for security-sensitive environments. Allows only read operations freely; file and shell writes require human approval. Blocks all network writes, database mutations, dangerous/admin shell commands, and credential file access.",
  rules: [
    DENY_SHELL_DANGER,
    DENY_SHELL_ADMIN,
    DENY_SHELL_WRITE,
    DENY_DB_DANGER,
    DENY_DB_WRITE,
    DENY_FILE_DELETE,
    DENY_NETWORK_WRITE,
    DENY_HTTP_POST,
    DENY_HTTP_PUT,
    DENY_HTTP_DELETE,
    DENY_ENV_FILE,
    DENY_PEM_FILE,
    DENY_KEY_FILE,
    DENY_PFX_FILE,
    DENY_SSH_KEY,
    DENY_SECRETS_FILE,
    DENY_CREDENTIALS_FILE,
    DENY_TOKEN_FILE,
    ALLOW_FILE_WRITE_APPROVAL,
    ALLOW_SHELL_WRITE_APPROVAL,
    ALLOW_SHELL_READ,
    ALLOW_FILE_READ,
    ALLOW_FILE_LIST,
    ALLOW_FILE_INFO,
    ALLOW_GIT_READ,
    ALLOW_DB_READ,
    ALLOW_HTTP_GET,
  ],
  categories,
};
