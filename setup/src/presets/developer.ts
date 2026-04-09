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
  conditions: { path_pattern: ".env" },
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
        description: "Prevents agents from reading .pem and .key files",
        defaultOn: true,
        rules: [DENY_PEM_FILE, DENY_KEY_FILE],
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
    ALLOW_ALL,
  ],
  categories,
};
