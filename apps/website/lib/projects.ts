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
    description: "change your code → testie tests it in a real browser",
    features: [
      "no playwright scripts",
      "no selectors to maintain",
      "just your git diff",
    ],
    command: "npx testie@latest",
    agentPrompt: "Run testie to test my current changes",
    githubUrl: "https://github.com/millionco/testie",
    docsUrl: "#",
  },
];
