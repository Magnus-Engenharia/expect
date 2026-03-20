import * as crypto from "node:crypto";
import * as path from "node:path";
import {
  SAVED_FLOW_DIRECTORY_FALLBACK_SEGMENT,
  SAVED_FLOW_DIRECTORY_HASH_LENGTH,
} from "../constants";
import { slugify } from "./slugify";

const ROOT_SEPARATOR_PATTERN = /[/:\\]+/g;

const getRootSegment = (rootPath: string): string | null => {
  const normalizedRoot = slugify(rootPath.replace(ROOT_SEPARATOR_PATTERN, "-"));
  return normalizedRoot === "untitled-flow" ? null : normalizedRoot;
};

const getSluggedPathSegments = (directoryPath: string): string[] => {
  const pathSegments: string[] = [];
  let currentPath = path.resolve(directoryPath);

  while (currentPath) {
    const parsedPath = path.parse(currentPath);

    if (parsedPath.base) {
      pathSegments.unshift(slugify(parsedPath.base));
    }

    if (!parsedPath.dir || parsedPath.dir === parsedPath.root) {
      const rootSegment = getRootSegment(parsedPath.root);
      return rootSegment ? [rootSegment, ...pathSegments] : pathSegments;
    }

    currentPath = parsedPath.dir;
  }

  return pathSegments;
};

const getDirectoryHash = (directoryPath: string): string =>
  crypto
    .createHash("sha256")
    .update(path.resolve(directoryPath))
    .digest("hex")
    .slice(0, SAVED_FLOW_DIRECTORY_HASH_LENGTH);

export const getTestieProjectPathSegments = (cwd: string = process.cwd()): string[] => {
  const sluggedPathSegments = getSluggedPathSegments(cwd);
  const uniquePathSegments =
    sluggedPathSegments.length > 0
      ? [...sluggedPathSegments]
      : [SAVED_FLOW_DIRECTORY_FALLBACK_SEGMENT];
  const leafSegmentIndex = uniquePathSegments.length - 1;

  uniquePathSegments[leafSegmentIndex] =
    `${uniquePathSegments[leafSegmentIndex]}-${getDirectoryHash(cwd)}`;

  return uniquePathSegments;
};
