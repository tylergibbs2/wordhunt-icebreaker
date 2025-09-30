interface CellProps {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
  stressLevel: number; // 2 = green, 1 = yellow, 0 = red
  isCrumbling?: boolean;
  isFadingIn?: boolean;
  isShaking?: boolean;
  onPointerDown: (e: React.PointerEvent, row: number, col: number) => void;
}

export const Cell = ({
  letter,
  row,
  col,
  isSelected,
  stressLevel,
  isCrumbling = false,
  isFadingIn = false,
  isShaking = false,
  onPointerDown,
}: CellProps) => {
  // Debug logging
  if (isShaking) {
    console.log(`Cell ${row}-${col} is shaking`);
  }

  const getStressClass = () => {
    switch (stressLevel) {
      case 2:
        return 'stress-green';
      case 1:
        return 'stress-yellow';
      case 0:
        return 'stress-red';
      default:
        return 'stress-green';
    }
  };

  return (
    <div
      className={`board-cell ${isSelected ? 'selected' : ''} ${getStressClass()} ${isCrumbling ? 'crumbling' : ''} ${isFadingIn ? 'fade-in' : ''} ${isShaking ? 'shaking' : ''}`}
      onPointerDown={e => onPointerDown(e, row, col)}
    >
      {letter.toUpperCase()}
    </div>
  );
};
