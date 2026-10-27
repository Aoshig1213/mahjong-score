import { WIND_NAMES } from '../../engine/tiles';
import { seatWind, type Game } from '../../game/game';

/** 4人から選ぶボタン（複数選べる・1人だけ選べるの両方に使う） */
export function PlayerPicker({
  game,
  selected,
  onToggle,
  disabled = [],
}: {
  game: Game;
  selected: number[];
  onToggle: (player: number) => void;
  disabled?: number[];
}) {
  return (
    <div className="player-picker">
      {game.settings.players.map((name, p) => (
        <button
          key={p}
          type="button"
          className={selected.includes(p) ? 'chip active' : 'chip'}
          aria-pressed={selected.includes(p)}
          disabled={disabled.includes(p)}
          onClick={() => onToggle(p)}
        >
          <span className="chip-wind">{WIND_NAMES[seatWind(p, game.round)]}</span>
          {name}
        </button>
      ))}
    </div>
  );
}

export const toggle = (list: number[], p: number) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]);

export const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString());

/** 点数の増減の確認表 */
export function DeltaTable({ game, deltas }: { game: Game; deltas: number[] }) {
  return (
    <table className="delta-table">
      <thead>
        <tr>
          <th></th>
          <th>今</th>
          <th>増減</th>
          <th>後</th>
        </tr>
      </thead>
      <tbody>
        {game.settings.players.map((name, p) => (
          <tr key={p}>
            <td>
              <span className="chip-wind">{WIND_NAMES[seatWind(p, game.round)]}</span>
              {name}
            </td>
            <td>{game.scores[p].toLocaleString()}</td>
            <td className={deltas[p] > 0 ? 'plus' : deltas[p] < 0 ? 'minus' : ''}>{deltas[p] === 0 ? '±0' : signed(deltas[p])}</td>
            <td>{(game.scores[p] + deltas[p]).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
