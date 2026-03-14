import { Box, Text } from "ink";
import { Clickable } from "./clickable.js";

export interface HintSegment {
  key: string;
  label: string;
  onClick?: () => void;
}

export const HINT_SEPARATOR = "   ";

interface HintBarProps {
  readonly segments: HintSegment[];
  readonly backgroundColor: string;
  readonly color: string;
  readonly mutedColor: string;
}

const HintContent = ({
  segment,
  backgroundColor,
  color,
  mutedColor,
}: {
  segment: HintSegment;
  backgroundColor: string;
  color: string;
  mutedColor: string;
}) => (
  <>
    <Text backgroundColor={backgroundColor} color={color} bold>
      {segment.key}
    </Text>
    <Text backgroundColor={backgroundColor} color={mutedColor}>
      {" "}
      {segment.label}
    </Text>
  </>
);

export const HintBar = ({ segments, backgroundColor, color, mutedColor }: HintBarProps) => (
  <Box>
    <Text backgroundColor={backgroundColor} color={color}>
      {" "}
    </Text>
    {segments.map((segment, index) => (
      <Box key={segment.key + segment.label}>
        {segment.onClick ? (
          <Clickable fullWidth={false} onClick={segment.onClick}>
            <HintContent
              segment={segment}
              backgroundColor={backgroundColor}
              color={color}
              mutedColor={mutedColor}
            />
          </Clickable>
        ) : (
          <HintContent
            segment={segment}
            backgroundColor={backgroundColor}
            color={color}
            mutedColor={mutedColor}
          />
        )}
        {index < segments.length - 1 && (
          <Text backgroundColor={backgroundColor} color={mutedColor}>
            {HINT_SEPARATOR}
          </Text>
        )}
      </Box>
    ))}
  </Box>
);
