import { Text } from "ink";
import figures from "figures";
import { useColors } from "../theme-context.js";
import { Clickable } from "./clickable.js";

interface ListItemProps {
  readonly isSelected: boolean;
  readonly onClick?: () => void;
  readonly children: React.ReactNode;
}

export const ListItem = ({ isSelected, onClick, children }: ListItemProps) => {
  const COLORS = useColors();
  return (
    <Clickable onClick={onClick}>
      <Text color={isSelected ? COLORS.ORANGE : COLORS.DIM}>
        {isSelected ? `${figures.pointer} ` : "  "}
      </Text>
      {children}
    </Clickable>
  );
};
