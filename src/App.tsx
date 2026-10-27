import { useState } from 'react';
import { DEFAULT_RULES, type Rules } from './engine/types';
import { Calculator } from './ui/Calculator';
import { RulesPanel } from './ui/RulesPanel';

const RULES_KEY = 'mahjong-score.rules';

function loadRules(): Rules {
  try {
    const saved = localStorage.getItem(RULES_KEY);
    return saved ? { ...DEFAULT_RULES, ...JSON.parse(saved) } : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function App() {
  const [rules, setRules] = useState(loadRules);
  const changeRules = (next: Rules) => {
    setRules(next);
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても、開いている間は使える
    }
  };

  return (
    <>
      <header className="app-header">
        <h1>麻雀点数計算</h1>
      </header>
      <main>
        <Calculator rules={rules} />
        <RulesPanel rules={rules} onChange={changeRules} />
      </main>
    </>
  );
}
