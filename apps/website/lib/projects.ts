interface Project {
  title: string;
  description: string;
  features: string[];
  command: string;
  agentPrompt: string;
  githubUrl: string;
  docsUrl: string;
}

export const PROJECTS: Project[] = [
  {
    title: "testie",
    description:
      "Let coding agents test your code in a real browser. One command scans your changes, generates a test plan, and runs it against a live browser.",
    features: [
      "Tests unstaged changes or branch diffs automatically",
      "Generates and executes test plans in a real browser",
      "Works headlessly inside any coding agent",
    ],
    command: "npx @browser-tester/cli@latest",
    agentPrompt: "Run testie to test my current changes",
    githubUrl: "https://github.com/AidenYBai/testie",
    docsUrl: "#",
  },
];
