// ===== components/tools/MatchInsights.tsx =====
import React, { useMemo, useState } from "react";
import { buildScoreMatrix, oneX2FromMatrix, topScorelines } from "../../lib/tools/poisson";
import {
  decimalToProb,
  normalizeProbs,
  overroundOfOdds,
  probsToDecimal,
  type OneX2,
} from "../../lib/tools/odds";
import { kelly } from "../../lib/tools/kelly";
import { copyToClipboard, downloadCSV } from "../../lib/tools/exporters";

const EXAMPLE = {
  home: "FC Example",
  away: "AC Sample",
  lambdaH: 1.65,
  lambdaA: 1.05,
  maxGoals: 8,
  line: 2.5,
  oddsH: 2.1,
  oddsD: 3.4,
  oddsA: 3.6,
  bankroll: 100,
  cap: 0.1,
};

type NumberMaybe = number | "";

type MarketKey = "home" | "draw" | "away" | "over" | "under" | "btts-yes" | "btts-no";

function NumberInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    hint?: string;
  },
) {
  const { id, label, hint, className, ...rest } = props;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className={`px-3 py-2 border rounded-xl outline-none focus:ring-2 ring-offset-1 ring-indigo-500/50 ${className ?? ""}`}
      />
      {hint ? (
        <span className="text-xs text-neutral-500" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

async function exportCaptureAsPNG(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  if (!width || !height) return;

  const clone = node.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n  <foreignObject width="100%" height="100%">${serialized}</foreignObject>\n</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = url;
    });

    const scale = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    await new Promise<void>((resolve) => {
      canvas.toBlob((png) => {
        if (png) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(png);
          a.download = `match_insights_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        resolve();
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pct(x: number, digits = 2) {
  return `${(x * 100).toFixed(digits)}%`;
}

function fmtDecimal(x: number) {
  return Number.isFinite(x) ? x.toFixed(2) : "—";
}

export default function MatchInsights() {
  const [home, setHome] = useState(EXAMPLE.home);
  const [away, setAway] = useState(EXAMPLE.away);
  const [lambdaH, setLambdaH] = useState(EXAMPLE.lambdaH);
  const [lambdaA, setLambdaA] = useState(EXAMPLE.lambdaA);
  const [maxGoals, setMaxGoals] = useState(EXAMPLE.maxGoals);
  const [line, setLine] = useState(EXAMPLE.line);
  const [oddsH, setOddsH] = useState<NumberMaybe>(EXAMPLE.oddsH);
  const [oddsD, setOddsD] = useState<NumberMaybe>(EXAMPLE.oddsD);
  const [oddsA, setOddsA] = useState<NumberMaybe>(EXAMPLE.oddsA);
  const [bankroll, setBankroll] = useState(EXAMPLE.bankroll);
  const [cap, setCap] = useState(EXAMPLE.cap);
  const [selectedMarket, setSelectedMarket] = useState<MarketKey>("home");

  const matrix = useMemo(
    () => buildScoreMatrix(lambdaH, lambdaA, maxGoals),
    [lambdaH, lambdaA, maxGoals],
  );
  const top = useMemo(() => topScorelines(matrix, home, away, 5), [matrix, home, away]);
  const modelPX2: OneX2 = useMemo(() => oneX2FromMatrix(matrix), [matrix]);
  const modelFairOdds: OneX2 = useMemo(() => probsToDecimal(modelPX2), [modelPX2]);

  const totals = useMemo(() => {
    let over = 0;
    let both = 0;
    for (const row of matrix) {
      for (const cell of row) {
        if (cell.h + cell.a > line) over += cell.p;
        if (cell.h > 0 && cell.a > 0) both += cell.p;
      }
    }
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    over = clamp(over);
    both = clamp(both);
    return { over, under: clamp(1 - over), bttsYes: both, bttsNo: clamp(1 - both) };
  }, [matrix, line]);

  const marketPX2: OneX2 | null = useMemo(() => {
    if (oddsH && oddsD && oddsA) {
      const normalized = normalizeProbs({
        home: decimalToProb(Number(oddsH)),
        draw: decimalToProb(Number(oddsD)),
        away: decimalToProb(Number(oddsA)),
      });
      return normalized;
    }
    return null;
  }, [oddsH, oddsD, oddsA]);

  const overround = useMemo(() => {
    if (oddsH && oddsD && oddsA) {
      return overroundOfOdds(Number(oddsH), Number(oddsD), Number(oddsA));
    }
    return 0;
  }, [oddsH, oddsD, oddsA]);

  const kellyStake = useMemo(() => {
    if (!marketPX2 || !(oddsH && oddsD && oddsA)) return null;
    const fracHome = kelly(modelPX2.home, Number(oddsH), cap);
    const fracDraw = kelly(modelPX2.draw, Number(oddsD), cap);
    const fracAway = kelly(modelPX2.away, Number(oddsA), cap);
    return {
      frac: {
        home: fracHome,
        draw: fracDraw,
        away: fracAway,
      },
      stake: {
        home: +(bankroll * fracHome).toFixed(2),
        draw: +(bankroll * fracDraw).toFixed(2),
        away: +(bankroll * fracAway).toFixed(2),
      },
    };
  }, [marketPX2, oddsH, oddsD, oddsA, modelPX2, bankroll, cap]);

  const marketOptions = useMemo(() => {
    return [
      { key: "home" as MarketKey, label: "1X2 · Home", prob: modelPX2.home, fair: modelFairOdds.home, stake: kellyStake?.stake.home ?? null },
      { key: "draw" as MarketKey, label: "1X2 · Draw", prob: modelPX2.draw, fair: modelFairOdds.draw, stake: kellyStake?.stake.draw ?? null },
      { key: "away" as MarketKey, label: "1X2 · Away", prob: modelPX2.away, fair: modelFairOdds.away, stake: kellyStake?.stake.away ?? null },
      { key: "over" as MarketKey, label: `Over ${line}`, prob: totals.over, fair: totals.over > 0 ? 1 / totals.over : 0, stake: null },
      { key: "under" as MarketKey, label: `Under ${line}`, prob: totals.under, fair: totals.under > 0 ? 1 / totals.under : 0, stake: null },
      { key: "btts-yes" as MarketKey, label: "BTTS · Yes", prob: totals.bttsYes, fair: totals.bttsYes > 0 ? 1 / totals.bttsYes : 0, stake: null },
      { key: "btts-no" as MarketKey, label: "BTTS · No", prob: totals.bttsNo, fair: totals.bttsNo > 0 ? 1 / totals.bttsNo : 0, stake: null },
    ];
  }, [modelPX2, modelFairOdds, kellyStake, totals, line]);

  const selected = marketOptions.find((opt) => opt.key === selectedMarket) ?? marketOptions[0];

  const kellyLineText = kellyStake
    ? `Kelly stake(¥)  H ${kellyStake.stake.home} · D ${kellyStake.stake.draw} · A ${kellyStake.stake.away}   (cap ${(cap * 100).toFixed(0)}%)`
    : "Kelly stake — 输入市场赔率后计算";

  async function handleCopySummary() {
    const lines: string[] = [];
    lines.push(`# Match Insights · ${home} vs ${away}`);
    lines.push(`λ: ${lambdaH} - ${lambdaA}, K=${maxGoals}, line=${line}`);
    lines.push(`Model 1X2 % → H ${pct(modelPX2.home)} · D ${pct(modelPX2.draw)} · A ${pct(modelPX2.away)}`);
    lines.push(`Model fair odds → H ${modelFairOdds.home.toFixed(2)} · D ${modelFairOdds.draw.toFixed(2)} · A ${modelFairOdds.away.toFixed(2)}`);
    lines.push(`Totals: Over ${pct(totals.over)} / Under ${pct(totals.under)} · BTTS Yes ${pct(totals.bttsYes)} / No ${pct(totals.bttsNo)}`);
    if (oddsH && oddsD && oddsA) {
      lines.push(`Market odds → H ${Number(oddsH).toFixed(2)} · D ${Number(oddsD).toFixed(2)} · A ${Number(oddsA).toFixed(2)} (overround ${(overround * 100).toFixed(2)}%)`);
    }
    if (kellyStake) {
      lines.push(kellyLineText);
    }
    lines.push(
      `Top scorelines: ${top.map((t) => `${t.label} ${pct(t.p, 2)}`).join("; ")}`,
    );
    await copyToClipboard(lines.join("\n"));
  }

  function handleExportCSV() {
    const rows: (string | number)[][] = [["Home", "Away", "Score", "Prob%"]];
    top.forEach((t) => rows.push([home, away, t.label, (t.p * 100).toFixed(2)]));
    downloadCSV(rows, `match_insights_${home.replace(/\s+/g, "_")}_vs_${away.replace(/\s+/g, "_")}.csv`);
  }

  async function handleExportPNG() {
    await exportCaptureAsPNG("mi-capture");
  }

  function fillExample() {
    setHome(EXAMPLE.home);
    setAway(EXAMPLE.away);
    setLambdaH(EXAMPLE.lambdaH);
    setLambdaA(EXAMPLE.lambdaA);
    setMaxGoals(EXAMPLE.maxGoals);
    setLine(EXAMPLE.line);
    setOddsH(EXAMPLE.oddsH);
    setOddsD(EXAMPLE.oddsD);
    setOddsA(EXAMPLE.oddsA);
    setBankroll(EXAMPLE.bankroll);
    setCap(EXAMPLE.cap);
    setSelectedMarket("home");
  }

  return (
    <div className="grid gap-6">
      <section
        className="grid gap-4 p-4 bg-white rounded-2xl shadow-sm border"
        aria-labelledby="mi-inputs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mi-inputs" className="text-lg font-semibold">
            Input
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="fill-example"
              onClick={fillExample}
              className="px-3 py-2 rounded-xl border text-sm hover:bg-neutral-100"
            >
              填充示例
            </button>
            <button
              type="button"
              id="mi-calc"
              onClick={() => {}}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            >
              计算
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberInput id="homeTeam" label="Home team" value={home} onChange={(e) => setHome(e.target.value)} />
          <NumberInput id="awayTeam" label="Away team" value={away} onChange={(e) => setAway(e.target.value)} />
          <NumberInput
            id="maxGoals"
            label="Max goals K"
            type="number"
            min={4}
            max={12}
            step={1}
            value={maxGoals}
            onChange={(e) => setMaxGoals(Number(e.target.value) || EXAMPLE.maxGoals)}
            hint="矩阵维度（默认 8）"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NumberInput
            id="lambdaH"
            label="λ Home"
            type="number"
            step={0.05}
            value={lambdaH}
            onChange={(e) => setLambdaH(Number(e.target.value) || 0)}
          />
          <NumberInput
            id="lambdaA"
            label="λ Away"
            type="number"
            step={0.05}
            value={lambdaA}
            onChange={(e) => setLambdaA(Number(e.target.value) || 0)}
          />
          <NumberInput
            id="totalLine"
            label="OU line"
            type="number"
            step={0.5}
            value={line}
            onChange={(e) => setLine(Number(e.target.value) || EXAMPLE.line)}
          />
          <NumberInput
            id="bankroll"
            label="Bankroll"
            type="number"
            step={10}
            value={bankroll}
            onChange={(e) => setBankroll(Number(e.target.value) || EXAMPLE.bankroll)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NumberInput
            id="oddsH"
            label="Market odds · Home"
            type="number"
            step={0.01}
            value={oddsH}
            onChange={(e) => setOddsH(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <NumberInput
            id="oddsD"
            label="Market odds · Draw"
            type="number"
            step={0.01}
            value={oddsD}
            onChange={(e) => setOddsD(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <NumberInput
            id="oddsA"
            label="Market odds · Away"
            type="number"
            step={0.01}
            value={oddsA}
            onChange={(e) => setOddsA(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <NumberInput
            id="kellyCap"
            label="Kelly cap (frac)"
            type="number"
            step={0.01}
            value={cap}
            onChange={(e) => setCap(Math.max(0, Number(e.target.value) || 0))}
            hint="单注上限（比例，默认 0.1）"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            id="mi-copy"
            onClick={handleCopySummary}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          >
            复制摘要
          </button>
          <button
            type="button"
            id="mi-export-csv"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300"
          >
            导出 CSV
          </button>
          <button
            type="button"
            id="mi-export-png"
            onClick={handleExportPNG}
            className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300"
          >
            导出 PNG
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-neutral-600">Kelly market</span>
            <select
              id="mi-kelly-market"
              className="border rounded-lg px-2 py-1"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value as MarketKey)}
            >
              {marketOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div id="mi-capture" className="grid gap-6">
        <section className="grid gap-4 p-4 bg-white rounded-2xl shadow-sm border" aria-labelledby="mi-model">
          <h2 id="mi-model" className="text-lg font-semibold">
            Model 1X2（Poisson ⟶ 归一）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-neutral-500">Model prob %</div>
              <div className="text-lg font-semibold mt-1">
                H {pct(modelPX2.home)} · D {pct(modelPX2.draw)} · A {pct(modelPX2.away)}
              </div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-neutral-500">Model fair odds</div>
              <div className="text-lg font-semibold mt-1">
                H {modelFairOdds.home.toFixed(2)} · D {modelFairOdds.draw.toFixed(2)} · A {modelFairOdds.away.toFixed(2)}
              </div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-neutral-500">Top scorelines</div>
              <table className="w-full text-sm mt-2 border-t">
                <thead>
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="py-1">Score</th>
                    <th className="py-1">Prob%</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((t) => (
                    <tr key={t.label}>
                      <td className="py-0.5">{t.label}</td>
                      <td className="py-0.5">{(t.p * 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-4 p-4 bg-white rounded-2xl shadow-sm border" aria-labelledby="mi-market">
          <h2 id="mi-market" className="text-lg font-semibold">
            Market vs Model（含 Kelly）
          </h2>
          {oddsH && oddsD && oddsA ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-xl">
                  <div className="text-sm text-neutral-500">Market odds</div>
                  <div className="text-lg font-semibold mt-1">
                    H {Number(oddsH).toFixed(2)} · D {Number(oddsD).toFixed(2)} · A {Number(oddsA).toFixed(2)}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Overround {(overround * 100).toFixed(2)}%</div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="text-sm text-neutral-500">Market prob %（归一）</div>
                  {marketPX2 ? (
                    <div className="text-lg font-semibold mt-1">
                      H {pct(marketPX2.home)} · D {pct(marketPX2.draw)} · A {pct(marketPX2.away)}
                    </div>
                  ) : (
                    <div className="text-lg font-semibold mt-1">—</div>
                  )}
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="text-sm text-neutral-500">Kelly stake（¥）</div>
                  <div className="text-lg font-semibold mt-1" id="kellyLine">
                    {kellyStake ? (
                      <>
                        <span className="block">
                          H {kellyStake.stake.home} · D {kellyStake.stake.draw} · A {kellyStake.stake.away}
                        </span>
                        <div className="text-xs text-neutral-500 mt-1">
                          frac: H {pct(kellyStake.frac.home)} · D {pct(kellyStake.frac.draw)} · A {pct(kellyStake.frac.away)}
                        </div>
                      </>
                    ) : (
                      <span>Kelly stake — 输入市场赔率后计算</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl">
                  <div className="text-sm text-neutral-500">选中市场</div>
                  <div className="text-lg font-semibold mt-1">
                    {selected.label}
                  </div>
                  <div className="text-sm text-neutral-600 mt-2">
                    模型概率 {pct(selected.prob)} · 公平赔率 {fmtDecimal(selected.fair)}
                  </div>
                  {selected.stake != null ? (
                    <div className="text-sm text-indigo-600 mt-1">推荐注额（Kelly）: ¥{selected.stake}</div>
                  ) : (
                    <div className="text-xs text-neutral-500 mt-1">Kelly 仅对 1X2 市场计算注额</div>
                  )}
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="text-sm text-neutral-500">Totals & BTTS</div>
                  <table className="w-full text-sm mt-2 border-t">
                    <tbody>
                      <tr>
                        <td className="py-1">Over {line}</td>
                        <td className="py-1 text-right">{pct(totals.over)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Under {line}</td>
                        <td className="py-1 text-right">{pct(totals.under)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">BTTS Yes</td>
                        <td className="py-1 text-right">{pct(totals.bttsYes)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">BTTS No</td>
                        <td className="py-1 text-right">{pct(totals.bttsNo)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-600">（可选）输入 1X2 赔率以计算边际与 Kelly 注额。</p>
          )}
        </section>
      </div>

      <footer className="text-xs text-neutral-500">
        本页仅为算法演示，不构成投注建议。请理性参与，风险自负。
      </footer>
    </div>
  );
}
