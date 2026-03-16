import type { Mutation } from "./types.ts";

export const MUTATIONS: Mutation[] = [
  {
    id: "team-role-swap",
    name: "Team: role dropdown values swapped",
    description:
      "Swap the value attributes for admin/member options in the role select. Selecting 'admin' actually sets 'member' and vice versa.",
    filePath: "evals/app/src/pages/team.tsx",
    search: `<option value="admin">admin</option>
              <option value="member">member</option>`,
    replace: `<option value="member">admin</option>
              <option value="admin">member</option>`,
    expectedStatus: "failed",
  },
  {
    id: "settings-save-resets-form",
    name: "Settings: save profile clears form fields",
    description:
      "After saving profile, form fields are reset to empty strings. The save works but the form appears blank afterward.",
    filePath: "evals/app/src/pages/settings.tsx",
    search: `setSavedProfile(nextSaved);
    setCurrentUser`,
    replace: `setSavedProfile(nextSaved);
    setProfileName("");
    setProfileAvatarUrl("");
    setCurrentUser`,
    expectedStatus: "failed",
  },
  {
    id: "billing-invoice-total-off",
    name: "Dashboard: monthly spend off by $1",
    description:
      "Change the reduce initial accumulator from 0 to 1, making every monthly spend total $1.00 too high.",
    filePath: "evals/app/src/pages/dashboard.tsx",
    search: `.reduce((sum, invoice) => sum + invoice.amount, 0)`,
    replace: `.reduce((sum, invoice) => sum + invoice.amount, 1)`,
    expectedStatus: "failed",
  },
  {
    id: "features-toggle-noop",
    name: "Features: toggle switch is a no-op",
    description:
      "Remove negation in toggle handler so enabled is set to its current value. Clicking the toggle does nothing.",
    filePath: "evals/app/src/pages/features.tsx",
    search: `const newEnabled = !flag.enabled;`,
    replace: `const newEnabled = flag.enabled;`,
    expectedStatus: "failed",
  },
  {
    id: "team-remove-wrong-member",
    name: "Team: remove compares id to name (never matches)",
    description:
      "Filter compares member.name against memberToRemove.id. Since names never equal IDs, no member is ever removed.",
    filePath: "evals/app/src/pages/team.tsx",
    search: `member.id !== memberToRemove.id`,
    replace: `member.name !== memberToRemove.id`,
    expectedStatus: "failed",
  },
  {
    id: "settings-timezone-not-dirty",
    name: "Settings: timezone change doesn't enable Save",
    description:
      "Remove setIsOrgDirty(true) from timezone onChange. The Save button stays disabled after changing timezone.",
    filePath: "evals/app/src/pages/settings.tsx",
    search: `setOrgTimezone(event.target.value);
                setIsOrgDirty(true);`,
    replace: `setOrgTimezone(event.target.value);`,
    expectedStatus: "failed",
  },
  {
    id: "billing-plan-features-swapped",
    name: "Billing: Pro and Enterprise feature lists swapped",
    description:
      "Pro plan card shows Enterprise features and vice versa. Diff looks like reorganizing a data file.",
    filePath: "evals/app/src/data.ts",
    search: `features: PRO_FEATURES },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    interval: "month",
    features: ENTERPRISE_FEATURES,
  },`,
    replace: `features: ENTERPRISE_FEATURES },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    interval: "month",
    features: PRO_FEATURES,
  },`,
    expectedStatus: "failed",
  },
  {
    id: "features-search-case-sensitive",
    name: "Features: search becomes case-sensitive",
    description:
      "Remove toLowerCase() from the search query side. Searching 'Dark' won't find 'Dark Mode' because comparison is against lowercased name.",
    filePath: "evals/app/src/pages/features.tsx",
    search: `flag.name.toLowerCase().includes(searchQuery.toLowerCase())`,
    replace: `flag.name.toLowerCase().includes(searchQuery)`,
    expectedStatus: "failed",
  },
  {
    id: "team-invite-allows-duplicates",
    name: "Team: duplicate invite check only catches admins",
    description:
      "Add && member.role === 'admin' to duplicate check. Looks like adding a restriction but actually weakens the guard.",
    filePath: "evals/app/src/pages/team.tsx",
    search: `member.email.toLowerCase() === inviteEmail.toLowerCase()`,
    replace: `member.email.toLowerCase() === inviteEmail.toLowerCase() && member.role === "admin"`,
    expectedStatus: "failed",
  },
  {
    id: "settings-delete-confirm-weak",
    name: "Settings: delete confirmation accepts partial input",
    description:
      "Change exact match to startsWith. Typing just the first character of the org name enables the Delete button.",
    filePath: "evals/app/src/pages/settings.tsx",
    search: `confirmInput !== currentUser.organization`,
    replace: `confirmInput.length === 0 || !currentUser.organization.startsWith(confirmInput)`,
    expectedStatus: "failed",
  },

  {
    id: "dashboard-welcome-text",
    name: "Dashboard: change welcome greeting",
    description: "Change 'Welcome back' to 'Hello'. Pure text change, no functional impact.",
    filePath: "evals/app/src/pages/dashboard.tsx",
    search: `Welcome back, {currentUser.name}`,
    replace: `Hello, {currentUser.name}`,
    expectedStatus: "passed",
  },
  {
    id: "team-search-placeholder",
    name: "Team: update search placeholder text",
    description: "Change placeholder from 'Search members...' to 'Find a team member...'.",
    filePath: "evals/app/src/pages/team.tsx",
    search: `Search members...`,
    replace: `Find a team member...`,
    expectedStatus: "passed",
  },
  {
    id: "settings-tab-rename",
    name: "Settings: rename Danger Zone tab",
    description: "Rename the 'Danger Zone' tab label to 'Account Deletion'.",
    filePath: "evals/app/src/pages/settings.tsx",
    search: `label: "Danger Zone"`,
    replace: `label: "Account Deletion"`,
    expectedStatus: "passed",
  },
  {
    id: "billing-plan-rename",
    name: "Billing: rename Pro plan to Professional",
    description: "Change the Pro plan name in data. All references use plan.name dynamically.",
    filePath: "evals/app/src/data.ts",
    search: `name: "Pro"`,
    replace: `name: "Professional"`,
    expectedStatus: "passed",
  },
  {
    id: "features-empty-state",
    name: "Features: update empty state message",
    description: "Change 'No feature flags yet' to 'No feature flags have been created'.",
    filePath: "evals/app/src/pages/features.tsx",
    search: `No feature flags yet`,
    replace: `No feature flags have been created`,
    expectedStatus: "passed",
  },
];
