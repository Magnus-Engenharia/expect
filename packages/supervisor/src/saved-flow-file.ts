import { Schema } from "effect";
import type { BrowserEnvironmentHints, SavedFlow, SavedFlowFileData } from "./types";

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;

const SavedTargetScopeSchema = Schema.Union([
  Schema.Literal("unstaged"),
  Schema.Literal("branch"),
  Schema.Literal("changes"),
  Schema.Literal("commit"),
]);
const SavedFlowStepSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  instruction: Schema.String,
  expectedOutcome: Schema.String,
});
const SavedFlowSchema = Schema.Struct({
  title: Schema.String,
  userInstruction: Schema.String,
  steps: Schema.Array(SavedFlowStepSchema),
});
const SavedFlowEnvironmentSchema = Schema.Struct({
  baseUrl: Schema.optional(Schema.String),
  headed: Schema.optional(Schema.Boolean),
  cookies: Schema.optional(Schema.Boolean),
});
const SavedFlowFrontmatterSchema = Schema.Struct({
  format_version: Schema.Number,
  title: Schema.String,
  description: Schema.String,
  slug: Schema.String,
  saved_target_scope: SavedTargetScopeSchema,
  saved_target_display_name: Schema.String,
  selected_commit: Schema.optional(
    Schema.Struct({
      hash: Schema.String,
      shortHash: Schema.String,
      subject: Schema.String,
    }),
  ),
  flow: SavedFlowSchema,
  environment: SavedFlowEnvironmentSchema,
});

interface SavedFlowFrontmatterData {
  format_version: number;
  title: string;
  description: string;
  slug: string;
  saved_target_scope: "unstaged" | "branch" | "changes" | "commit";
  saved_target_display_name: string;
  selected_commit?: {
    hash: string;
    shortHash: string;
    subject: string;
  };
  flow: SavedFlow;
  environment: BrowserEnvironmentHints;
}

const serializeFrontmatterField = (key: string, value: unknown): string | undefined => {
  const serializedValue = JSON.stringify(value);
  if (serializedValue === undefined) {
    return undefined;
  }

  return `${key}: ${serializedValue}`;
};

const formatEnvironmentValue = (label: string, value: string | boolean | undefined): string =>
  `- ${label}: ${value === undefined ? "not specified" : String(value)}`;

export const formatSavedFlowFrontmatter = (data: SavedFlowFileData): string =>
  [
    "---",
    serializeFrontmatterField("format_version", data.formatVersion),
    serializeFrontmatterField("title", data.title),
    serializeFrontmatterField("description", data.description),
    serializeFrontmatterField("slug", data.slug),
    serializeFrontmatterField("saved_target_scope", data.savedTargetScope),
    serializeFrontmatterField("saved_target_display_name", data.savedTargetDisplayName),
    serializeFrontmatterField("selected_commit", data.selectedCommit),
    serializeFrontmatterField("flow", data.flow),
    serializeFrontmatterField("environment", data.environment),
    "---",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

export const formatSavedFlowFile = (data: SavedFlowFileData): string => {
  const formattedSteps = data.flow.steps
    .map((step, index) =>
      [
        `### ${index + 1}. ${step.title}`,
        "",
        `Instruction: ${step.instruction}`,
        `Expected outcome: ${step.expectedOutcome}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    formatSavedFlowFrontmatter(data),
    "",
    `# ${data.title}`,
    "",
    data.description,
    "",
    "## User Instruction",
    "",
    data.flow.userInstruction,
    "",
    "## Target",
    "",
    `- Scope: ${data.savedTargetScope}`,
    `- Display name: ${data.savedTargetDisplayName}`,
    ...(data.selectedCommit
      ? [`- Selected commit: ${data.selectedCommit.shortHash} ${data.selectedCommit.subject}`]
      : []),
    "",
    "## Environment",
    "",
    formatEnvironmentValue("Base URL", data.environment.baseUrl),
    formatEnvironmentValue("Headed", data.environment.headed),
    formatEnvironmentValue("Cookie sync", data.environment.cookies),
    "",
    "## Steps",
    "",
    formattedSteps,
    "",
  ].join("\n");
};

const parseFrontmatter = (content: string): SavedFlowFrontmatterData | undefined => {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) return undefined;

  const rawEntries = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rawFrontmatter: Record<string, unknown> = {};

  for (const entry of rawEntries) {
    const separatorIndex = entry.indexOf(":");
    if (separatorIndex === -1) return undefined;

    const key = entry.slice(0, separatorIndex).trim();
    const rawValue = entry.slice(separatorIndex + 1).trim();
    if (!key || !rawValue) return undefined;
    if (rawValue === "undefined") continue;

    rawFrontmatter[key] = JSON.parse(rawValue);
  }

  return Schema.decodeUnknownSync(SavedFlowFrontmatterSchema)(rawFrontmatter);
};

export const parseSavedFlowFile = (content: string): SavedFlowFileData | undefined => {
  try {
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) return undefined;

    return {
      formatVersion: frontmatter.format_version,
      title: frontmatter.title,
      description: frontmatter.description,
      slug: frontmatter.slug,
      savedTargetScope: frontmatter.saved_target_scope,
      savedTargetDisplayName: frontmatter.saved_target_display_name,
      selectedCommit: frontmatter.selected_commit,
      flow: frontmatter.flow,
      environment: frontmatter.environment,
    };
  } catch {
    return undefined;
  }
};
