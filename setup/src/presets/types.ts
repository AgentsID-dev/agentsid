export interface PolicyRule {
  readonly toolPattern: string;
  readonly action: "allow" | "deny";
  readonly priority: number;
  readonly conditions?: Record<string, unknown>;
  readonly requiresApproval?: boolean;
}

export interface PolicyCategory {
  readonly name: string;
  readonly label: string;
  readonly toggles: readonly PolicyToggle[];
}

export interface PolicyToggle {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly defaultOn: boolean;
  readonly rules: readonly PolicyRule[];
}

export interface PolicyPreset {
  readonly name: string;
  readonly description: string;
  readonly rules: readonly PolicyRule[];
  readonly categories: readonly PolicyCategory[];
}
