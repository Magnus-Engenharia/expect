import { useRef, useState } from "react";
import { Text } from "ink";
import { lerpColor } from "../../utils/lerp-color";
import { SHIMMER_TICK_MS, SHIMMER_GRADIENT_WIDTH } from "../../constants";

interface TextShimmerProps {
  text: string;
  baseColor: string;
  highlightColor: string;
  speed?: number;
}

export const TextShimmer = ({ text, baseColor, highlightColor, speed = 1 }: TextShimmerProps) => {
  const [position, setPosition] = useState(-SHIMMER_GRADIENT_WIDTH);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const textLengthRef = useRef(text.length);
  textLengthRef.current = text.length;

  const startedRef = useRef(false);
  if (!startedRef.current) {
    startedRef.current = true;
    setTimeout(() => {
      setInterval(() => {
        const upperBound = textLengthRef.current + SHIMMER_GRADIENT_WIDTH;
        setPosition((previous) =>
          previous >= upperBound ? -SHIMMER_GRADIENT_WIDTH : previous + speedRef.current,
        );
      }, SHIMMER_TICK_MS);
    }, 0);
  }

  return (
    <Text>
      {[...text].map((character, index) => {
        const distance = Math.abs(index - position);
        const intensity = Math.max(0, 1 - distance / SHIMMER_GRADIENT_WIDTH);
        const color = intensity > 0 ? lerpColor(baseColor, highlightColor, intensity) : baseColor;
        return (
          <Text key={index} color={color}>
            {character}
          </Text>
        );
      })}
    </Text>
  );
};
