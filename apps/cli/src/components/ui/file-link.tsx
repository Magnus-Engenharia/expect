import * as path from "node:path";
import * as url from "node:url";
import { Text } from "ink";
import Link from "ink-link";

interface FileLinkProps {
  path: string;
  label?: string;
}

const isFileUrl = (value: string): boolean => value.startsWith("file://");

export const FileLink = ({ path: filePath, label }: FileLinkProps) => {
  const absolutePath = isFileUrl(filePath) ? url.fileURLToPath(filePath) : path.resolve(filePath);
  const fileUrl = isFileUrl(filePath) ? filePath : url.pathToFileURL(absolutePath).href;

  return (
    <Link url={fileUrl}>
      <Text>{label ?? absolutePath}</Text>
    </Link>
  );
};
