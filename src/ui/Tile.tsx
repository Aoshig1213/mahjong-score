import type { TileCode } from '../engine/tiles';

const KANJI_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONORS = ['', '東', '南', '西', '北', '白', '發', '中'];
const SUIT_CHARS: Record<string, string> = { m: '萬', p: '筒', s: '索' };

interface Props {
  tile: TileCode;
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  label?: string;
}

export function Tile({ tile, size = 'md', onClick, disabled, highlight, label }: Props) {
  const red = tile[0] === '0';
  const num = red ? 5 : Number(tile[0]);
  const suit = tile[1];
  const className = [
    'tile',
    `tile-${size}`,
    `suit-${suit}`,
    suit === 'z' ? `honor-${num}` : '',
    red ? 'tile-red' : '',
    highlight ? 'tile-highlight' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const face =
    suit === 'z' ? (
      <span className="tile-honor">{HONORS[num]}</span>
    ) : (
      <>
        <span className="tile-num">{suit === 'm' ? KANJI_NUMBERS[num] : num}</span>
        <span className="tile-suit">{SUIT_CHARS[suit]}</span>
      </>
    );

  const name = label ?? `${red ? '赤' : ''}${suit === 'z' ? HONORS[num] : `${num}${SUIT_CHARS[suit]}`}`;
  if (!onClick) {
    return (
      <span className={className} role="img" aria-label={name}>
        {face}
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} aria-label={name}>
      {face}
    </button>
  );
}
