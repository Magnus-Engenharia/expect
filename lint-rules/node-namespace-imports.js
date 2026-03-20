const CAMEL_CASE_MAP = {
  child_process: "childProcess",
  string_decoder: "stringDecoder",
  worker_threads: "workerThreads",
  async_hooks: "asyncHooks",
  trace_events: "traceEvents",
  perf_hooks: "perfHooks",
};

const deriveNamespaceName = (modulePath) => {
  const parts = modulePath.split("/");
  return parts
    .map((part, index) => {
      const name = CAMEL_CASE_MAP[part] || part;
      return index === 0 ? name : name.charAt(0).toUpperCase() + name.slice(1);
    })
    .join("");
};

const rule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    messages: {
      namespaceImport:
        "Use namespace import (`import * as {{namespace}} from \"{{source}}\"`) for Node.js modules. Named imports lose module context at call sites.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string" || !source.startsWith("node:")) return;

        if (node.importKind === "type") return;

        if (node.specifiers.length === 0) return;

        if (node.specifiers.some((s) => s.type === "ImportNamespaceSpecifier")) return;

        if (node.specifiers.some((s) => s.type === "ImportDefaultSpecifier")) return;

        const namedSpecifiers = node.specifiers.filter((s) => s.type === "ImportSpecifier");
        if (namedSpecifiers.length === 0) return;

        const moduleName = source.slice(5);
        const namespaceName = deriveNamespaceName(moduleName);

        context.report({
          node,
          messageId: "namespaceImport",
          data: { source, namespace: namespaceName },
          fix(fixer) {
            const sourceCode = context.sourceCode || context.getSourceCode();
            const scope = sourceCode.getScope(node);
            const fixes = [];

            const conflictingVar = scope.set.get(namespaceName);
            if (conflictingVar && !conflictingVar.defs.some((d) => d.parent === node)) {
              return null;
            }

            fixes.push(
              fixer.replaceText(node, `import * as ${namespaceName} from "${source}";`),
            );

            for (const specifier of namedSpecifiers) {
              if (specifier.importKind === "type") continue;

              const importedName = specifier.imported.name;
              const localName = specifier.local.name;
              const variable = scope.set.get(localName);
              if (!variable) continue;

              for (const reference of variable.references) {
                const refNode = reference.identifier;

                if (refNode.range[0] >= node.range[0] && refNode.range[1] <= node.range[1]) {
                  continue;
                }

                if (refNode.parent?.type === "ExportSpecifier") {
                  return null;
                }

                if (refNode.parent?.type === "Property" && refNode.parent.shorthand) {
                  fixes.push(
                    fixer.replaceText(
                      refNode.parent,
                      `${refNode.name}: ${namespaceName}.${importedName}`,
                    ),
                  );
                  continue;
                }

                fixes.push(fixer.replaceText(refNode, `${namespaceName}.${importedName}`));
              }
            }

            return fixes;
          },
        });
      },
    };
  },
};

const plugin = {
  meta: {
    name: "node-imports",
  },
  rules: {
    "namespace-imports": rule,
  },
};

export default plugin;
