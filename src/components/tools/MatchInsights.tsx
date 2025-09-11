// ===== components/tools/MatchInsights.tsx =====
import React, { useMemo, useState } from "react";
import { buildScoreMatrix, topScorelines, oneX2FromMatrix } from "../../lib/tools/poisson";
import { decimalToProb, normalizeProbs, probsToDecimal, overroundOfOdds, type OneX2 } from "../../lib/tools/odds";
import { kelly } from "../../lib/tools/kelly";
import { downloadCSV, copyToClipboard } from "../../lib/tools/exporters";

function NumberInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }
) {
  const { label, hint, className, ...rest } = props;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        className={`px-3 py-2 border rounded-xl outline-none focus:ring-2 ring-offset-1 ring-indigo-500/50 ${className ?? ""}`}
      />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export default function MatchInsights() {
  const [home, setHome] = useState("Home");
  const [away, setAway] = useState("Away");
  const [lambdaH, setLambdaH] = useState(1.6);
  const [lambdaA, setLambdaA] = useState(1.2);
  const [maxGoals, setMaxGoals] = useState(8);

  const [oddsH, setOddsH] = useState<number | "">(2.10);
  const [oddsD, setOddsD] = useState<number | "">(3.40);
  const [oddsA, setOddsA] = useState<number | "">(3.60);

  const [bankroll, setBankroll] = useState(100);
  const [cap, setCap] = useState(0.1); // Kelly 上限 10%

  // 计算矩阵 & 1X2
  const matrix = useMemo(() => buildScoreMatrix(lambdaH, lambdaA, maxGoals), [lambdaH, lambdaA, maxGoals]);
  const top = useMemo(() => topScorelines(matrix, home, away, 5), [matrix, home, away]);
  const modelPX2: OneX2 = useMemo(() => oneX2FromMatrix(matrix), [matrix]);

  const modelFairOdds: OneX2 = useMemo(() => probsToDecimal(modelPX2), [modelPX2]);

  const marketPX2: OneX2 | null = useMemo(() => {
    if (oddsH && oddsD && oddsA) {
      const p = { home: decimalToProb(Number(oddsH)), draw: decimalToProb(Number(oddsD)), away: decimalToProb(Number(oddsA)) };
      return normalizeProbs(p); // 归一化去除水位
    }
    return null;
  }, [oddsH, oddsD, oddsA]);

  const overround = useMemo(() => {
    if (oddsH && oddsD && oddsA) return overroundOfOdds(Number(oddsH), Number(oddsD), Number(oddsA));
    return 0;
  }, [oddsH, oddsD, oddsA]);

  const kellyStake = useMemo(() => {
    if (!marketPX2 || !(oddsH && oddsD && oddsA)) return null;
    const kH = kelly(modelPX2.home, Number(oddsH), cap);
    const kD = kelly(modelPX2.draw, Number(oddsD), cap);
    const kA = kelly(modelPX2.away, Number(oddsA), cap);
    return {
      frac: { home: kH, draw: kD, away: kA },
      stake: { home: +(bankroll * kH).toFixed(2), draw: +(bankroll * kD).toFixed(2), away: +(bankroll * kA).toFixed(2) },
    };
  }, [marketPX2, oddsH, oddsD, oddsA, modelPX2, bankroll, cap]);

  function exportScoreCSV() {
    const rows = [["Home", "Away", "Score", "Prob"]];
    top.forEach((t) => rows.push([home, away, t.label, t.p.toFixed(5)]));
    downloadCSV(rows, `scorelines_${home}_vs_${away}.csv`);
  }

  async function copySummary() {
    const lines: string[] = [];
    lines.push(`# ${home} vs ${away}`);
    lines.push(`λ: ${lambdaH} - ${lambdaA}, K=${maxGoals}`);
    lines.push(`Model 1X2 %: H ${(modelPX2.home*100).toFixed(2)} · D ${(modelPX2.draw*100).toFixed(2)} · A ${(modelPX2.away*100).toFixed(2)}`);
    lines.push(`Model fair odds: H ${modelFairOdds.home.toFixed(2)} · D ${modelFairOdds.draw.toFixed(2)} · A ${modelFairOdds.away.toFixed(2)}`);
    if (oddsH && oddsD && oddsA) {
      lines.push(`Market odds: H ${Number(oddsH).toFixed(2)} · D ${Number(oddsD).toFixed(2)} · A ${Number(oddsA).toFixed(2)} (overround ${(overround*100).toFixed(2)}%)`);
    }
    if (kellyStake) {
      lines.push(`Kelly stakes（bankroll ${bankroll}, cap ${(cap*100).toFixed(0)}%）:`);
      lines.push(`H ${kellyStake.stake.home} · D ${kellyStake.stake.draw} · A ${kellyStake.stake.away}`);
    }
    lines.push(`Top scorelines: ${top.map(t => `${t.label} ${ (t.p*100).toFixed(2)}%`).join("; ")}`);
    await copyToClipboard(lines.join("\n"));
  }

  return (
    <div className="grid gap-6">
      {/* 输入区 */}
      <section className="grid gap-4 p-4 bg-white rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold">Input</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberInput label="Home team" value={home} onChange={(e)=>setHome(e.target.value)} />
          <NumberInput label="Away team" value={away} onChange={(e)=>setAway(e.target.value)} />
          <NumberInput label="Max goals K" type="number" step="1" min={4} max={12} value={maxGoals}
            onChange={(e)=>setMaxGoals(Number(e.target.value)||8)} hint="矩阵维度（默认 8）" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NumberInput label="λ(Home)" type="number" step="0.05" value={lambdaH}
            onChange={(e)=>setLambdaH(Number(e.target.value)||0)} hint="主队期望进球" />
          <NumberInput label="λ(Away)" type="number" step="0.05" value={lambdaA}
            onChange={(e)=>setLambdaA(Number(e.target.value)||0)} hint="客队期望进球" />
          <NumberInput label="Bankroll" type="number" step="1" value={bankroll}
            onChange={(e)=>setBankroll(Number(e.target.value)||0)} />
          <NumberInput label="Kelly cap" type="number" step="0.01" value={cap}
            onChange={(e)=>setCap(Number(e.target.value)||0)} hint="单注上限（比例）" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberInput label="Market odds - Home" type="number" step="0.01" value={oddsH}
            onChange={(e)=>setOddsH(e.target.value===""?"":Number(e.target.value))} />
          <NumberInput label="Market odds - Draw" type="number" step="0.01" value={oddsD}
            onChange={(e)=>setOddsD(e.target.value===""?"":Number(e.target.value))} />
          <NumberInput label="Market odds - Away" type="number" step="0.01" value={oddsA}
            onChange={(e)=>setOddsA(e.target.value===""?"":Number(e.target.value))} />
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={copySummary} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">复制摘要</button>
          <button onClick={exportScoreCSV} className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300">导出 Top5 CSV</button>
        </div>
      </section>

      {/* 模型输出 */}
      <section className="grid gap-4 p-4 bg-white rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold">Model 1X2（Poisson ⟶ 归一）</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-xl">
            <div className="text-sm text-neutral-500">Model prob %</div>
            <div className="text-lg font-semibold mt-1">H {(modelPX2.home*100).toFixed(2)} · D {(modelPX2.draw*100).toFixed(2)} · A {(modelPX2.away*100).toFixed(2)}</div>
          </div>
          <div className="p-4 border rounded-xl">
            <div className="text-sm text-neutral-500">Model fair odds</div>
            <div className="text-lg font-semibold mt-1">H {modelFairOdds.home.toFixed(2)} · D {modelFairOdds.draw.toFixed(2)} · A {modelFairOdds.away.toFixed(2)}</div>
          </div>
          <div className="p-4 border rounded-xl">
            <div className="text-sm text-neutral-500">Top scorelines</div>
            <div className="mt-1 space-y-1">
              {top.map((t)=> (
                <div key={t.label} className="flex justify-between text-sm">
                  <span>{t.label}</span>
                  <span>{(t.p*100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 市场对比 & Kelly */}
      <section className="grid gap-4 p-4 bg-white rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold">Market vs Model（含 Kelly）</h2>
        {oddsH && oddsD && oddsA ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-xl">
                <div className="text-sm text-neutral-500">Market odds</div>
                <div className="text-lg font-semibold mt-1">H {Number(oddsH).toFixed(2)} · D {Number(oddsD).toFixed(2)} · A {Number(oddsA).toFixed(2)}</div>
                <div className="text-xs text-neutral-500 mt-1">Overround {(overround*100).toFixed(2)}%</div>
              </div>
              <div className="p-4 border rounded-xl">
                <div className="text-sm text-neutral-500">Market prob %（归一）</div>
                <div className="text-lg font-semibold mt-1">H {(marketPX2!.home*100).toFixed(2)} · D {(marketPX2!.draw*100).toFixed(2)} · A {(marketPX2!.away*100).toFixed(2)}</div>
              </div>
              <div className="p-4 border rounded-xl">
                <div className="text-sm text-neutral-500">Kelly stake（¥）</div>
                <div className="text-lg font-semibold mt-1">
                  {kellyStake ? (
                    <>
                      H {kellyStake.stake.home} · D {kellyStake.stake.draw} · A {kellyStake.stake.away}
                      <div className="text-xs text-neutral-500 mt-1">frac: H {(kellyStake.frac.home*100).toFixed(2)}% · D {(kellyStake.frac.draw*100).toFixed(2)}% · A {(kellyStake.frac.away*100).toFixed(2)}%</div>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-500">说明：Kelly 使用模型概率 p 与市场赔率 o 计算，若 p 无优势则结果为 0；默认单注上限为 {Math.round(cap*100)}%。</p>
          </>
        ) : (
          <p className="text-sm text-neutral-600">（可选）输入 1X2 赔率以计算边际与 Kelly 注额。</p>
        )}
      </section>

      <footer className="text-xs text-neutral-500">
        本页仅为算法演示，不构成投注建议。请理性参与，风险自负。
      </footer>
    </div>
  );
}
