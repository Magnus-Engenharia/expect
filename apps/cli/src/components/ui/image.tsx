import * as path from "node:path";
import { useRef } from "react";
import { useStdout } from "ink";
import { buildImageSequence } from "../../utils/build-image-sequence";
import { supportsInlineImages } from "../../utils/supports-inline-images";
import { FileLink } from "./file-link";

interface ImageProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
}

export const Image = ({ src, alt, width, height }: ImageProps) => {
  const absolutePath = path.resolve(src);
  const { write } = useStdout();
  const hasRendered = useRef(false);

  if (!hasRendered.current) {
    const sequence = buildImageSequence(absolutePath, { width, height });
    if (sequence) {
      write(sequence + "\n");
      hasRendered.current = true;
    }
  }

  if (supportsInlineImages) {
    return null;
  }

  return <FileLink path={absolutePath} label={alt} />;
};
