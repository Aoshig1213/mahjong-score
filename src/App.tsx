import { useState } from 'react';
import { DEFAULT_RULES, type Rules } from './engine/types';
import { applyHand, continueByDealer, endByDealer, newGame, roundLabel, type Game, type HandEvent } from './game/game';
import { buildRecord, type Member } from './records/records';
import { loadMembers, putGames, saveMembers } from './records/store';
import { RecordsView } from './ui/records/RecordsView';
import { Calculator } from './ui/Calculator';
import { DrawFlow } from './ui/game/DrawFlow';
import { GameSetup } from './ui/game/GameSetup';
import { GameTable } from './ui/game/GameTable';
import { loadGame, saveGame, saveLastPlayers, type SavedGame } from './ui/game/storage';
import { WinFlow } from './ui/game/WinFlow';
import { RulesPanel } from './ui/RulesPanel';
import { Tile } from './ui/Tile';

const RULES_KEY = 'mahjong-score.rules';
/** 1局戻すために覚えておく局の数 */
const MAX_UNDO = 50;

type View = 'home' | 'calc' | 'setup' | 'table' | 'win' | 'draw' | 'abort' | 'records';

function loadRules(): Rules {
  try {
    const saved = localStorage.getItem(RULES_KEY);
    return saved ? { ...DEFAULT_RULES, ...JSON.parse(saved) } : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

function MenuItem(props: { tile: string; title: string; desc: string; primary?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={props.primary ? 'menu-item primary' : 'menu-item'} onClick={props.onClick}>
      <Tile tile={props.tile} size="sm" />
      <span>
        <span className="menu-title">{props.title}</span>
        <span className="menu-desc">{props.desc}</span>
      </span>
      <span className="menu-arrow" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export function App() {
  const [rules, setRules] = useState(loadRules);
  const [saved, setSaved] = useState<SavedGame | null>(loadGame);
  const [view, setView] = useState<View>('home');
  const [members, setMembers] = useState<Member[]>(loadMembers);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const changeMembers = (next: Member[]) => {
    setMembers(next);
    saveMembers(next);
  };

  const changeRules = (next: Rules) => {
    setRules(next);
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても、開いている間は使える
    }
  };

  const store = (next: SavedGame | null) => {
    setSaved(next);
    saveGame(next);
  };

  /** 今の状態を「1局戻す」用に覚えてから、次の状態にする */
  const advance = (next: Game) => {
    if (!saved) return;
    store({ game: next, past: [...saved.past, saved.game].slice(-MAX_UNDO) });
    setView('table');
  };

  const game = saved?.game;
  const apply = (event: HandEvent) => game && advance(applyHand(game, event));

  let body;
  if (view === 'calc') {
    body = <Calculator rules={rules} />;
  } else if (view === 'records') {
    body = <RecordsView members={members} onMembersChange={changeMembers} />;
  } else if (view === 'setup') {
    body = (
      <GameSetup
        rules={rules}
        members={members}
        onCancel={() => setView('home')}
        onStart={(settings, nextMembers) => {
          changeMembers(nextMembers);
          saveLastPlayers(settings.playerIds ?? settings.players);
          store({ game: newGame(settings), past: [] });
          setView('table');
        }}
      />
    );
  } else if (game && view === 'table') {
    body = (
      <>
      {saveError && <p className="message">{saveError}</p>}
      <GameTable
        game={game}
        canUndo={saved.past.length > 0}
        onWin={() => setView('win')}
        onDraw={() => setView('draw')}
        onAbort={() => setView('abort')}
        onUndo={() => store({ game: saved.past[saved.past.length - 1], past: saved.past.slice(0, -1) })}
        onEndByDealer={() => advance(endByDealer(game))}
        onContinueByDealer={() => advance(continueByDealer(game))}
        onFixScores={(scores) => advance({ ...game, scores })}
        saving={saving}
        onSave={async () => {
          setSaving(true);
          setSaveError(null);
          try {
            await putGames([buildRecord(game)]);
            store(null);
            setView('records');
          } catch {
            setSaveError('成績を保存できませんでした。もう一度押してください');
          } finally {
            setSaving(false);
          }
        }}
        onQuit={() => {
          store(null);
          setView('home');
        }}
      />
      </>
    );
  } else if (game && view === 'win') {
    body = <WinFlow game={game} onApply={apply} onCancel={() => setView('table')} />;
  } else if (game && (view === 'draw' || view === 'abort')) {
    body = <DrawFlow key={view} game={game} abort={view === 'abort'} onApply={apply} onCancel={() => setView('table')} />;
  } else {
    body = (
      <div className="screen">
        <div className="hero">
          <div className="hero-tiles" aria-hidden="true">
            <Tile tile="1p" size="lg" />
            <Tile tile="7z" size="lg" />
            <Tile tile="1s" size="lg" />
          </div>
          <h1>雀算</h1>
          <p>麻雀点数計算・点棒管理・成績</p>
        </div>
        <nav className="menu">
          {game && (
            <MenuItem
              primary
              tile="6z"
              title="続きから"
              desc={game.status === 'finished' ? '終局した対局（まだ保存していません）' : `${roundLabel(game.round)}から再開`}
              onClick={() => setView('table')}
            />
          )}
          <MenuItem
            primary={!game}
            tile="1z"
            title="新しい対局"
            desc={game ? '始めると、途中の対局は消えます' : '席と持ち点を決めて、1局ずつ記録'}
            onClick={() => setView('setup')}
          />
          <MenuItem tile="5m" title="点数計算" desc="手牌から点数だけを出す" onClick={() => setView('calc')} />
          <MenuItem tile="9p" title="成績" desc="メンバーごとの順位・スコア・和了率" onClick={() => setView('records')} />
        </nav>
        <RulesPanel rules={rules} onChange={changeRules} />
      </div>
    );
  }

  const showHome = view === 'calc' || view === 'table' || view === 'setup' || view === 'records';
  return (
    <>
      <header className="app-header">
        <button type="button" className="brand" onClick={() => showHome && setView('home')} aria-label="雀算（ホームへ）">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          <span>
            <span className="brand-name">雀算</span>
            <br />
            <span className="brand-sub">麻雀点数計算</span>
          </span>
        </button>
        {showHome && (
          <button type="button" className="header-link" onClick={() => setView('home')}>
            ホーム
          </button>
        )}
      </header>
      <main>{body}</main>
    </>
  );
}
