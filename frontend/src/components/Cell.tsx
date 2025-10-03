interface CellProps {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
  stressLevel: number; // 2 = green, 1 = yellow, 0 = red
  isCrumbling?: boolean;
  isFadingIn?: boolean;
  isShaking?: boolean;
  isCharacterMorphing?: boolean;
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
  isCharacterMorphing = false,
  onPointerDown,
}: CellProps) => {
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
      className={`board-cell ${isSelected ? 'selected' : ''} ${getStressClass()} ${isCrumbling ? 'crumbling' : ''} ${isFadingIn ? 'fade-in' : ''} ${isCharacterMorphing ? 'character-morph' : ''} ${isShaking ? 'shaking' : ''}`}
      onPointerDown={e => onPointerDown(e, row, col)}
    >
      <div className="board-cell-text">{letter.toUpperCase()}</div>
    </div>
  );
};
