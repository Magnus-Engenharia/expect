import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FRAMEWORK_DEFAULT_PORTS } from "./constants";

type Framework =
  | "next"
  | "vite"
  | "angular"
  | "remix"
  | "astro"
  | "nuxt"
  | "sveltekit"
  | "gatsby"
  | "create-react-app"
  | "unknown";

interface ProjectDetection {
  framework: Framework;
  defaultPort: number;
  customPort: number | undefined;
}

const readPackageJson = (projectRoot: string): Record<string, unknown> | undefined => {
  const packageJsonPath = join(projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) return undefined;
  try {
    return JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  } catch {
    return undefined;
  }
};

const hasDependency = (packageJson: Record<string, unknown>, name: string): boolean => {
  const deps = packageJson["dependencies"];
  const devDeps = packageJson["devDependencies"];
  return Boolean(
    (deps && typeof deps === "object" && name in deps) ||
      (devDeps && typeof devDeps === "object" && name in devDeps),
  );
};

const FRAMEWORK_DETECTION_ORDER: Array<[string, Framework]> = [
  ["next", "next"],
  ["@angular/core", "angular"],
  ["@remix-run/react", "remix"],
  ["astro", "astro"],
  ["nuxt", "nuxt"],
  ["@sveltejs/kit", "sveltekit"],
  ["gatsby", "gatsby"],
  ["react-scripts", "create-react-app"],
  ["vite", "vite"],
];

const detectFramework = (packageJson: Record<string, unknown> | undefined): Framework => {
  if (!packageJson) return "unknown";

  for (const [dependency, framework] of FRAMEWORK_DETECTION_ORDER) {
    if (hasDependency(packageJson, dependency)) return framework;
  }

  return "unknown";
};

const VITE_BASED_FRAMEWORKS = new Set<Framework>(["vite", "remix", "astro", "sveltekit"]);
const PORT_FLAG_REGEX = /(?:--port|-p)\s+(\d+)/;
const VITE_PORT_REGEX = /port\s*:\s*(\d+)/;

const detectCustomPort = (
  projectRoot: string,
  packageJson: Record<string, unknown> | undefined,
  framework: Framework,
): number | undefined => {
  if (packageJson) {
    const scripts = packageJson["scripts"];
    if (scripts && typeof scripts === "object") {
      const devScript = (scripts as Record<string, unknown>)["dev"];
      if (typeof devScript === "string") {
        const flagMatch = PORT_FLAG_REGEX.exec(devScript);
        if (flagMatch) return Number(flagMatch[1]);
      }
    }
  }

  if (VITE_BASED_FRAMEWORKS.has(framework)) {
    try {
      const entries = readdirSync(projectRoot);
      const viteConfig = entries.find((entry) => entry.startsWith("vite.config."));
      if (viteConfig) {
        const content = readFileSync(join(projectRoot, viteConfig), "utf-8");
        const portMatch = VITE_PORT_REGEX.exec(content);
        if (portMatch) return Number(portMatch[1]);
      }
    } catch {
    }
  }

  return undefined;
};

export const detectProject = (projectRoot?: string): ProjectDetection => {
  const root = projectRoot ?? process.cwd();
  const packageJson = readPackageJson(root);
  const framework = detectFramework(packageJson);
  const defaultPort = FRAMEWORK_DEFAULT_PORTS[framework] ?? 3000;
  const customPort = detectCustomPort(root, packageJson, framework);

  return { framework, defaultPort, customPort };
};
