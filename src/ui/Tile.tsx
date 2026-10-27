import type { TileCode } from '../engine/tiles';
import { tileFaceSvg } from './tileSvg';

const HONORS = ['', '東', '南', '西', '北', '白', '發', '中'];
const SUIT_NAMES: Record<string, string> = { m: '萬', p: '筒', s: '索' };

interface Props {
  tile: TileCode;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  /** 横向き（鳴いた牌） */
  sideways?: boolean;
}

export function tileLabel(tile: TileCode): string {
  const red = tile[0] === '0';
  const num = red ? 5 : Number(tile[0]);
  return `${red ? '赤' : ''}${tile[1] === 'z' ? HONORS[num] : `${num}${SUIT_NAMES[tile[1]]}`}`;
}

export function Tile({ tile, size = 'md', onClick, disabled, highlight, sideways }: Props) {
  const className = ['tile', `tile-${size}`, highlight ? 'tile-highlight' : '', sideways ? 'tile-sideways' : '']
    .filter(Boolean)
    .join(' ');
  // 絵柄は固定の文字列から作るので、そのまま埋め込んでよい
  const face = <svg className="tile-face" viewBox="0 0 60 80" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tileFaceSvg(tile) }} />;

  if (!onClick) {
    return (
      <span className={className} role="img" aria-label={tileLabel(tile)}>
        {face}
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} aria-label={tileLabel(tile)}>
      {face}
    </button>
  );
}
