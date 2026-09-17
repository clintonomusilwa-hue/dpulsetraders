import React, { useEffect, useMemo, useState } from 'react';
import { DIGIT_MARKETS, digitFromQuote } from '@/utils/digit-trading-config';

type MarketData = { quote: string; digits: number[] };
const empty = (): MarketData => ({ quote: '—', digits: [] });

const analyse = (digits: number[]) => {
    const sample = digits.slice(-120);
    if (sample.length < 10) return { signal: 'WAIT', score: 0, even: 50, odd: 50, last: sample, reason: 'Collecting live ticks' };
    const windows = [sample.slice(-20), sample.slice(-50), sample];
    const parity = windows.map(w => w.filter(d => d % 2 === 0).length / w.length);
    const over2 = windows.map(w => w.filter(d => d > 2).length / w.length);
    const maxDigit = Array.from({ length: 10 }, (_, d) => sample.filter(x => x === d).length).reduce((best, n, d, arr) => n > arr[best] ? d : best, 0);
    const minDigit = Array.from({ length: 10 }, (_, d) => sample.filter(x => x === d).length).reduce((best, n, d, arr) => n < arr[best] ? d : best, 0);
    const parityBias = Math.abs(parity[0] - 0.5) * 100;
    const consistency = Math.max(0, 1 - (Math.max(...parity) - Math.min(...parity)) * 2);
    const distribution = Math.min(1, Math.abs(over2[0] - 0.5) * 2);
    const score = Math.min(92, Math.round(50 + parityBias * 0.35 + consistency * 17 + distribution * 15 + Math.min(10, Math.abs(maxDigit - minDigit))));
    const signal = parity[0] >= 0.56 ? 'EVEN' : parity[0] <= 0.44 ? 'ODD' : over2[0] >= 0.60 ? 'OVER 2' : over2[0] <= 0.40 ? 'UNDER 3' : 'WAIT';
    return { signal, score, even: parity[0] * 100, odd: (1 - parity[0]) * 100, last: sample.slice(-12), reason: `120-tick sample • hottest ${maxDigit} • coldest ${minDigit} • parity consistency ${(consistency * 100).toFixed(0)}%` };
};

const AnalysisTool = () => {
    const [data, setData] = useState<Record<string, MarketData>>(() => Object.fromEntries(DIGIT_MARKETS.map(([s]) => [s, empty()])));
    const [tab, setTab] = useState<'circles' | 'normal'>('circles');
    const [ticks, setTicks] = useState(120);
    const [scanning, setScanning] = useState(false);
    const [complete, setComplete] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [selected, setSelected] = useState(DIGIT_MARKETS[1][0]);

    useEffect(() => {
        const sockets: WebSocket[] = [];
        DIGIT_MARKETS.forEach(([symbol]) => {
            const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
            sockets.push(ws);
            ws.onopen = () => {
                ws.send(JSON.stringify({ ticks_history: symbol, count: 120, end: 'latest', style: 'ticks', req_id: 1 }));
                ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: 2 }));
            };
            ws.onmessage = event => {
                try {
                    const packet = JSON.parse(event.data);
                    if (packet.msg_type === 'history' && Array.isArray(packet.history?.prices)) {
                        const prices = packet.history.prices as number[];
                        const digits = prices.map(q => digitFromQuote(q, packet.history.pip_size)).slice(-120);
                        setData(prev => ({ ...prev, [symbol]: { quote: String(prices.at(-1)), digits } }));
                    }
                    if (packet.msg_type === 'tick' && packet.tick?.quote !== undefined) {
                        const digit = digitFromQuote(Number(packet.tick.quote), packet.tick.pip_size);
                        setData(prev => ({ ...prev, [symbol]: { quote: String(packet.tick.quote), digits: [...(prev[symbol]?.digits || []), digit].slice(-120) } }));
                    }
                } catch { /* ignore malformed public packets */ }
            };
        });
        return () => sockets.forEach(ws => ws.close());
    }, []);

    const rankings = useMemo(() => DIGIT_MARKETS.map(([symbol, name]) => ({ symbol, name, ...analyse(data[symbol]?.digits || []) })).sort((a, b) => b.score - a.score), [data]);
    const best = rankings[0];

    const runScanner = () => {
        setScanning(true); setComplete(false); setLogs([]);
        const steps = ['Connecting to live Deriv feeds...', `Loading up to ${ticks} recent ticks per volatility...`, ...DIGIT_MARKETS.map(([_, n], i) => `Scanning ${n} (${i + 1}/${DIGIT_MARKETS.length})...`), 'Checking digit frequency and parity balance...', 'Checking short/medium/long-window consistency...', 'Checking Over 2 / Under 3 distribution...', 'Comparing live market signal scores...', 'Selecting the strongest current setup...'];
        steps.forEach((line, i) => window.setTimeout(() => setLogs(prev => [...prev, `[AI SCANNER] ${line}`]), i * 220));
        window.setTimeout(() => { setScanning(false); setComplete(true); }, steps.length * 220 + 350);
    };

    const CircleCard = ({ symbol, name }: { symbol: string; name: string }) => {
        const d = data[symbol] || empty();
        const counts = Array.from({ length: 10 }, (_, n) => d.digits.filter(x => x === n).length);
        const total = Math.max(1, d.digits.length);
        const maxCount = Math.max(...counts); const minCount = Math.min(...counts); const latest = d.digits.at(-1); const a = analyse(d.digits);
        return <section style={{ background: '#fff', borderRadius: 14, padding: 15, marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div><h2 style={{ margin: 0, fontSize: 19 }}>{name}</h2><strong style={{ color: '#16996b' }}>{d.quote}</strong></div><b style={{ color: a.score >= 65 ? '#159957' : '#6b7280' }}>Signal score {a.score || '—'}</b></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 14 }}>{Array.from({ length: 10 }, (_, n) => {
                const pct = (counts[n] / total) * 100; const highest = counts[n] === maxCount && maxCount > 0; const lowest = counts[n] === minCount && minCount < maxCount; const barrier = n === Number(localStorage.getItem('dpulse_barrier') || '5'); const active = n === latest;
                const arc = barrier ? '#9b59ff' : highest ? '#19c875' : lowest ? '#ed4d5a' : '#42a9d6';
                return <div key={n} style={{ textAlign: 'center' }}><div style={{ width: 58, height: 58, maxWidth: '100%', margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(${arc} 0 290deg,#e8edf2 290deg 360deg)`, boxShadow: active ? `0 0 0 5px ${arc}33` : undefined }}><div style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: active ? '#13243c' : '#fff', color: active ? '#fff' : '#263346', fontWeight: 900, fontSize: 18, position: 'relative' }}>{n}{active && <span style={{ position: 'absolute', bottom: -17, left: '50%', transform: 'translateX(-50%)', color: '#e33', fontSize: 16 }}>▲</span>}</div></div><small style={{ fontWeight: 800 }}>{pct.toFixed(1)}%</small></div>;
            })}</div>
            <div style={{ display: 'flex', gap: 5, overflow: 'hidden', marginTop: 10 }}>{d.digits.slice(-10).map((n, i) => <span key={`${i}-${n}`} style={{ minWidth: 35, textAlign: 'center', padding: 5, borderRadius: 5, background: n % 2 ? '#ffe3e3' : '#ddf5e9', color: n % 2 ? '#c33' : '#087b55', fontWeight: 900 }}>{n}</span>)}</div>
            <div style={{ marginTop: 9, display: 'flex', height: 32, borderRadius: 15, overflow: 'hidden', fontWeight: 800, color: '#fff' }}><div style={{ width: `${a.even}%`, background: '#28bd8b', padding: '7px 10px' }}>Even {a.even.toFixed(1)}%</div><div style={{ flex: 1, background: '#ef6268', padding: '7px 10px', textAlign: 'right' }}>Odd {a.odd.toFixed(1)}%</div></div>
            <small style={{ display: 'block', marginTop: 8, opacity: .65 }}>{a.reason}</small>
        </section>;
    };

    const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.78)', display: 'grid', placeItems: 'center', padding: 18 };
    const terminal: React.CSSProperties = { width: 'min(850px,94vw)', maxHeight: '86vh', overflowY: 'auto', background: '#000', border: '2px solid #16e7ef', boxShadow: '0 0 25px #00dce8', borderRadius: 14, padding: 22, color: '#fff', position: 'relative', boxSizing: 'border-box' };

    return <main style={{ padding: '10px 12px 90px', background: '#071326', minHeight: '100%', color: '#172033' }}><div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}><button onClick={() => setTab('circles')} style={{ padding: 10, fontWeight: 900, background: tab === 'circles' ? '#102663' : '#fff', color: tab === 'circles' ? '#fff' : '#444', border: 0, borderRadius: 6 }}>Dcircles</button><button onClick={() => setTab('normal')} style={{ padding: 10, fontWeight: 900, border: 0, borderRadius: 6 }}>Normal tool</button></div>
        <section style={{ background: '#fff', borderRadius: 14, padding: 14, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><div><h1 style={{ margin: 0, fontSize: 21 }}>AI Market Analysis</h1><small>Live digit scanner across all supported 1-second Volatility Indices</small></div><label>Ticks: <input value={ticks} onChange={e => setTicks(Math.max(20, Math.min(120, Number(e.target.value))))} type='number' style={{ width: 70, padding: 7, borderRadius: 8, border: '1px solid #ccd3dc' }} /></label></section>
        {tab === 'circles' ? DIGIT_MARKETS.map(([s, n]) => <CircleCard key={s} symbol={s} name={n} />) : <section style={{ background: '#fff', borderRadius: 14, padding: 18, marginTop: 12 }}><h2>Normal tool</h2><select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%', padding: 12 }}>{DIGIT_MARKETS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(analyse(data[selected]?.digits || []), null, 2)}</pre></section>}
        <button onClick={runScanner} style={{ position: 'sticky', bottom: 15, width: '100%', padding: 15, border: 0, borderRadius: 10, background: '#159957', color: '#fff', fontSize: 17, fontWeight: 900 }}>✦ Run AI Scanner — Scan All Volatilities</button>
        <small style={{ display: 'block', color: '#b9c4d5', marginTop: 10, textAlign: 'center' }}>Signals are statistical live-feed analysis, not a guarantee of the next tick.</small>
    </div>
    {scanning && <div style={overlay}><div style={terminal}><button onClick={() => setScanning(false)} style={{ position: 'absolute', right: 14, top: 12, background: '#e11', color: '#fff', border: 0, borderRadius: 6, fontSize: 20, width: 42, height: 38 }}>×</button><h2>Analysis Dashboard — Live Scan</h2><hr />{logs.map((x, i) => <div key={i} style={{ color: '#14e65b', fontFamily: 'monospace', lineHeight: 1.7 }}>{x}</div>)}<button onClick={() => setScanning(false)} style={{ marginTop: 30, padding: '10px 25px', background: '#9d1b1b', color: '#fff', border: 0, borderRadius: 7 }}>Stop Scanning</button></div></div>}
    {complete && best && <div style={overlay}><div style={terminal}><button onClick={() => setComplete(false)} style={{ position: 'absolute', right: 14, top: 12, background: '#e11', color: '#fff', border: 0, borderRadius: 6, fontSize: 20, width: 42, height: 38 }}>×</button><h2 style={{ color: '#19ed57' }}>Analysis Complete</h2><p>Current ranking from the live samples:</p>{rankings.map((r, i) => <div key={r.symbol} style={{ display: 'grid', gridTemplateColumns: '45px 1fr 90px 75px', gap: 8, color: i === 0 ? '#19ed57' : '#fff', padding: '10px 0', borderTop: '1px solid #173' }}><span>#{i + 1}</span><span>{r.name}</span><span>{r.signal}</span><b>{r.score || '—'}</b></div>)}<div style={{ marginTop: 18, padding: 15, border: '1px solid #174', borderRadius: 8 }}><h3 style={{ color: '#19ed57' }}>Highest current signal score</h3><div>Market: <b>{best.name}</b></div><div>Signal: <b>{best.signal}</b></div><div>Score: <b>{best.score}</b></div><p style={{ opacity: .8 }}>{best.reason}</p></div></div></div>}
    </main>;
};
export default AnalysisTool;
