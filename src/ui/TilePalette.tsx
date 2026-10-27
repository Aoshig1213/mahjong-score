import type { TileCode } from '../engine/tiles';
import { Tile } from './Tile';

const ROWS: TileCode[][] = [
  ['1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m'],
  ['1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p'],
  ['1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s'],
  ['1z', '2z', '3z', '4z', '5z', '6z', '7z'],
];

interface Props {
  onTap: (tile: TileCode) => void;
  remaining: (tile: TileCode) => number;
}

export function TilePalette({ onTap, remaining }: Props) {
  return (
    <div className="palette">
      {ROWS.map((row) => (
        <div className="palette-row" key={row[0]}>
          {row.map((t) => (
            <Tile key={t} tile={t} onClick={() => onTap(t)} disabled={remaining(t) < 1} />
          ))}
        </div>
      ))}
    </div>
  );
}
