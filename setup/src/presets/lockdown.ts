import type { PolicyPreset, PolicyRule, PolicyCategory } from "./types.js";

const DENY_ALL: PolicyRule = {
  toolPattern: "*",
  action: "deny",
  priority: 100,
};

const ALLOW_SHELL_READ: PolicyRule = {
  toolPattern: "shell.read.*",
  action: "allow",
  priority: 50,
};

const ALLOW_FILE_READ: PolicyRule = {
  toolPattern: "file.read",
  action: "allow",
  priority: 50,
};

const ALLOW_FILE_LIST: PolicyRule = {
  toolPattern: "file.list",
  action: "allow",
  priority: 50,
};

const ALLOW_FILE_INFO: PolicyRule = {
  toolPattern: "file.info",
  action: "allow",
  priority: 50,
};

const ALLOW_GIT_READ: PolicyRule = {
  toolPattern: "git.read.*",
  action: "allow",
  priority: 50,
};

const ALLOW_DB_READ: PolicyRule = {
  toolPattern: "db.read",
  action: "allow",
  priority: 50,
};

const ALLOW_HTTP_GET: PolicyRule = {
  toolPattern: "http.get",
  action: "allow",
  priority: 50,
};

const categories: readonly PolicyCategory[] = [
  {
    name: "filesystem",
    label: "Filesystem",
    toggles: [
      {
        id: "filesystem.read",
        label: "Allow file reads",
        description: "Permits agents to read and list files",
        defaultOn: true,
        rules: [],
      },
    ],
  },
  {
    name: "shell",
    label: "Shell",
    toggles: [
      {
        id: "shell.read",
        label: "Allow shell read commands",
        description: "Permits agents to run read-only shell commands",
        defaultOn: true,
        rules: [],
      },
    ],
  },
  {
    name: "network",
    label: "Network",
    toggles: [
      {
        id: "network.get",
        label: "Allow HTTP GET",
        description: "Permits agents to make read-only HTTP requests",
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
        id: "database.read",
        label: "Allow database reads",
        description: "Permits agents to query the database in read-only mode",
        defaultOn: true,
        rules: [],
      },
    ],
  },
  {
    name: "git",
    label: "Git",
    toggles: [
      {
        id: "git.read",
        label: "Allow git read operations",
        description: "Permits agents to read git history and status",
        defaultOn: true,
        rules: [],
      },
    ],
  },
];

export const lockdownPreset: PolicyPreset = {
  name: "Lockdown",
  description:
    "Maximum restriction preset. Denies all operations by default and permits only explicit read-only operations: file reads/lists, shell reads, git reads, database reads, and HTTP GET.",
  rules: [
    DENY_ALL,
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
