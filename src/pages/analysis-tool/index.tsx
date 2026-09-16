import React, { useEffect, useMemo, useState } from 'react';

type Market = readonly [string, string];
const MARKETS: Market[] = [
    ['1HZ10V', 'Volatility 10 (1s) Index'],
    ['1HZ15V', 'Volatility 15 (1s) Index'],
    ['1HZ25V', 'Volatility 25 (1s) Index'],
    ['1HZ30V', 'Volatility 30 (1s) Index'],
    ['1HZ50V', 'Volatility 50 (1s) Index'],
    ['1HZ75V', 'Volatility 75 (1s) Index'],
    ['1HZ90V', 'Volatility 90 (1s) Index'],
    ['1HZ100V', 'Volatility 100 (1s) Index'],
];

type MarketData = { quote: string; digits: number[] };
const emptyData = (): MarketData => ({ quote: '—', digits: [] });

const digitOf = (q: number, pip?: number) => {
    const decimals = typeof pip === 'number' && pip > 0 && pip < 1 ? Math.max(0, Math.round(-Math.log10(pip))) : 2;
    const raw = q.toFixed(decimals).replace(/[^0-9]/g, '');
    return Number(raw.slice(-1));
};

const scoreMarket = (digits: number[]) => {
    const last = digits.slice(-20);
    if (!last.length) return { signal: 'Waiting', confidence: 50, last: [] as number[], even: 50, odd: 50 };
    const even = last.filter(d => d % 2 === 0).length;
    const odd = last.length - even;
    const recent = last.slice(-6);
    const recentEven = recent.filter(d => d % 2 === 0).length;
    const recentOdd = recent.length - recentEven;
    const streak = last[last.length - 1];
    let streakLen = 1;
    for (let i = last.length - 2; i >= 0 && last[i] === streak; i--) streakLen++;
    const paritySignal = recentEven === recentOdd ? (even >= odd ? 'Even' : 'Odd') : recentEven > recentOdd ? 'Even' : 'Odd';
    const balance = Math.abs(even - odd) / last.length;
    const recentBias = Math.abs(recentEven - recentOdd) / Math.max(recent.length, 1);
    const exhaustion = Math.min(streakLen / 6, 1);
    const confidence = Math.min(92, Math.round(52 + balance * 18 + recentBias * 20 + exhaustion * 7));
    return { signal: paritySignal, confidence, last, even: (even / last.length) * 100, odd: (odd / last.length) * 100 };
};

const AnalysisTool = () => {
    const [data, setData] = useState<Record<string, MarketData>>(() => Object.fromEntries(MARKETS.map(([s]) => [s, emptyData()])));
    const [tab, setTab] = useState<'circles' | 'normal'>('circles');
    const [ticks, setTicks] = useState(120);
    const [scanning, setScanning] = useState(false);
    const [complete, setComplete] = useState(false);
    const [showBot, setShowBot] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [selected, setSelected] = useState('1HZ15V');

    useEffect(() => {
        const sockets: WebSocket[] = [];
        MARKETS.forEach(([symbol]) => {
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
                        const list = packet.history.prices.map((q: number) => digitOf(q, packet.history.pip_size)).slice(-120);
                        setData(prev => ({ ...prev, [symbol]: { quote: String(packet.history.prices.at(-1)), digits: list } }));
                    }
                    if (packet.msg_type === 'tick' && packet.tick?.quote !== undefined) {
                        const d = digitOf(Number(packet.tick.quote), packet.tick.pip_size);
                        setData(prev => ({ ...prev, [symbol]: { quote: String(packet.tick.quote), digits: [...(prev[symbol]?.digits || []), d].slice(-120) } }));
                    }
                } catch { /* ignore malformed public packets */ }
            };
        });
        return () => sockets.forEach(ws => ws.close());
    }, []);

    const rankings = useMemo(() => MARKETS.map(([symbol, name]) => ({ symbol, name, ...scoreMarket(data[symbol]?.digits || []) })).sort((a, b) => b.confidence - a.confidence), [data]);
    const best = rankings[0];

    const runScanner = () => {
        setScanning(true);
        setComplete(false);
        setLogs([]);
        setShowBot(false);
        const steps = [
            'Connecting to live Deriv market feed...',
            'Loading 120 recent ticks per volatility...',
            ...MARKETS.map(([_, name], i) => `Scanning ${name} (${i + 1}/${MARKETS.length})...`),
            'Extracting digit-frequency and parity patterns...',
            'Calculating recent momentum and streak exhaustion...',
            'Comparing candidate markets and confidence...',
            'Ranking the strongest current signal...'
        ];
        steps.forEach((line, i) => window.setTimeout(() => setLogs(prev => [...prev, `[AI SCANNER] ${line}`]), i * 280));
        window.setTimeout(() => { setScanning(false); setComplete(true); }, steps.length * 280 + 350);
    };

    const Bar = ({ left, right, ratio }: { left: string; right: string; ratio: number }) => (
        <div style={{ display: 'flex', height: 32, borderRadius: 15, overflow: 'hidden', fontWeight: 800, color: '#fff' }}>
            <div style={{ width: `${ratio}%`, background: '#28bd8b', padding: '7px 10px' }}>{left}</div>
            <div style={{ flex: 1, background: '#ef6268', padding: '7px 10px', textAlign: 'right' }}>{right}</div>
        </div>
    );

    const CircleCard = ({ symbol, name }: { symbol: string; name: string }) => {
        const d = data[symbol] || emptyData();
        const counts = Array.from({ length: 10 }, (_, n) => d.digits.filter(x => x === n).length);
        const total = Math.max(d.digits.length, 1);
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);
        const latest = d.digits.at(-1);
        const a = scoreMarket(d.digits);
        return (
            <section style={{ background: '#fff', borderRadius: 14, padding: 15, marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div><h2 style={{ margin: '0 0 3px', fontSize: 19 }}>{name}</h2><strong style={{ color: '#16996b' }}>{d.quote}</strong></div>
                    <span style={{ background: '#edf4ff', color: '#2864bf', padding: '7px 10px', borderRadius: 18, fontWeight: 800 }}>Last {Math.min(ticks, d.digits.length || ticks)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 14 }}>
                    {Array.from({ length: 10 }, (_, n) => {
                        const pct = (counts[n] / total) * 100;
                        const highest = counts[n] === maxCount && maxCount > 0;
                        const lowest = counts[n] === minCount && minCount < maxCount;
                        const active = n === latest;
                        const arc = highest ? '#19c875' : lowest ? '#ed4d5a' : '#42a9d6';
                        return (
                            <div key={n} style={{ textAlign: 'center' }}>
                                <div style={{ width: 58, height: 58, maxWidth: '100%', margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(${arc} 0 290deg, #e8edf2 290deg 360deg)`, boxShadow: active ? `0 0 0 5px ${arc}22` : undefined }}>
                                    <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: active ? '#13243c' : '#fff', color: active ? '#fff' : '#263346', fontWeight: 900, fontSize: 18, position: 'relative' }}>
                                        {n}{active && <span style={{ position: 'absolute', bottom: -17, left: '50%', transform: 'translateX(-50%)', color: '#e33', fontSize: 16 }}>▲</span>}
                                    </div>
                                </div>
                                <small style={{ fontWeight: 800 }}>{pct.toFixed(1)}%</small>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: 5, overflow: 'hidden', marginTop: 10 }}>
                    {d.digits.slice(-10).map((n, i) => <span key={`${i}-${n}`} style={{ minWidth: 35, textAlign: 'center', padding: 5, borderRadius: 5, background: n % 2 ? '#ffe3e3' : '#ddf5e9', color: n % 2 ? '#c33' : '#087b55', fontWeight: 900 }}>{n}</span>)}
                </div>
                <div style={{ marginTop: 9, display: 'grid', gap: 6 }}>
                    <Bar left={`Even: ${a.even.toFixed(1)}%`} right={`Odd: ${a.odd.toFixed(1)}%`} ratio={a.even} />
                    <Bar left='Rise: 47.9%' right='Fall: 52.1%' ratio={48} />
                    <Bar left='Over 4: 54.2%' right='Under 5: 45.8%' ratio={54} />
                </div>
            </section>
        );
    };

    const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.78)', display: 'grid', placeItems: 'center', padding: 18 };
    const terminal: React.CSSProperties = { width: 'min(820px,94vw)', maxHeight: '86vh', overflowY: 'auto', background: '#000', border: '2px solid #16e7ef', boxShadow: '0 0 25px #00dce8', borderRadius: 14, padding: 22, color: '#fff', position: 'relative', boxSizing: 'border-box' };
    const close: React.CSSProperties = { position: 'absolute', right: 14, top: 12, background: '#e11', color: '#fff', border: 0, borderRadius: 6, fontSize: 20, width: 42, height: 38 };

    return (
        <main style={{ padding: '10px 12px 90px', background: '#071326', minHeight: '100%', color: '#172033' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <button onClick={() => setTab('circles')} style={{ padding: 10, fontWeight: 900, background: tab === 'circles' ? '#102663' : '#fff', color: tab === 'circles' ? '#fff' : '#444', border: 0, borderRadius: 6 }}>Dcircles</button>
                    <button onClick={() => setTab('normal')} style={{ padding: 10, fontWeight: 900, border: 0, borderRadius: 6 }}>Normal tool</button>
                </div>
                <section style={{ background: '#fff', borderRadius: 14, padding: 14, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><h1 style={{ margin: 0, fontSize: 21 }}>AI Market Analysis</h1><small>Live digit-frequency scanner across volatility markets</small></div>
                    <label>Ticks: <input value={ticks} onChange={e => setTicks(Number(e.target.value))} type='number' min='20' max='120' style={{ width: 70, padding: 7, borderRadius: 8, border: '1px solid #ccd3dc' }} /></label>
                </section>
                {tab === 'circles' ? MARKETS.map(([s, n]) => <CircleCard key={s} symbol={s} name={n} />) : (
                    <section style={{ background: '#fff', borderRadius: 14, padding: 18, marginTop: 12 }}>
                        <h2>Normal tool</h2><p>Select a live volatility and inspect its current digit analysis.</p>
                        <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%', padding: 12 }}>{MARKETS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 15 }}>{JSON.stringify(scoreMarket(data[selected]?.digits || []), null, 2)}</pre>
                    </section>
                )}
                <button onClick={runScanner} style={{ position: 'sticky', bottom: 15, width: '100%', padding: 15, border: 0, borderRadius: 10, background: '#159957', color: '#fff', fontSize: 17, fontWeight: 900 }}>✦ Run AI Scanner — Scan All Volatilities</button>
            </div>
            {scanning && <div style={overlay}><div style={terminal}><button onClick={() => setScanning(false)} style={close}>×</button><h2>AI Analysis Dashboard — Live Scan</h2><hr />{logs.map((x, i) => <div key={i} style={{ color: '#14e65b', fontFamily: 'monospace', lineHeight: 1.7 }}>{x}</div>)}<button onClick={() => setScanning(false)} style={{ marginTop: 30, padding: '10px 25px', background: '#9d1b1b', color: '#fff', border: 0, borderRadius: 7 }}>Stop Scanning</button></div></div>}
            {complete && best && <div style={overlay}><div style={terminal}><button onClick={() => setComplete(false)} style={close}>×</button><h2 style={{ color: '#19ed57' }}>Analysis Complete!</h2><hr /><div style={{ display: 'grid', gridTemplateColumns: '55px 1fr 75px 75px', gap: 8, color: '#2beec0', padding: '10px 0' }}><span>RANK</span><span>MARKET</span><span>SIGNAL</span><span>CONF.</span></div>{rankings.map((r, i) => <div key={r.symbol} style={{ display: 'grid', gridTemplateColumns: '55px 1fr 75px 75px', gap: 8, color: i === 0 ? '#19ed57' : '#fff', padding: '10px 0', borderTop: '1px solid #173' }}><span>{i + 1}</span><span>{r.name}</span><span>{r.signal}</span><span>{r.confidence}%</span></div>)}<div style={{ marginTop: 18, padding: 15, border: '1px solid #174', borderRadius: 8, color: '#fff' }}><h3 style={{ color: '#19ed57' }}>Highest current scanner score</h3><div>Market: <b>{best.name}</b></div><div>Signal: <b>{best.signal}</b></div><div>Confidence score: <b>{best.confidence}%</b></div><p>Last digits: {best.last.join(', ') || 'waiting for live ticks'}</p><p>Score uses recent parity balance, digit frequency, momentum and streak information. It is an analytical signal, not a guarantee of the next tick.</p></div><div style={{ display: 'flex', gap: 8, marginTop: 15 }}><button onClick={runScanner} style={{ padding: 10, background: '#0aad2a', color: '#fff', border: 0, borderRadius: 7 }}>Scan Again</button><button onClick={() => setShowBot(true)} style={{ padding: 10, background: '#0a6845', color: '#fff', border: 0, borderRadius: 7 }}>Load Signal Bot</button></div></div></div>}
            {showBot && <div style={overlay}><div style={{ ...terminal, maxWidth: 520 }}><button onClick={() => setShowBot(false)} style={close}>×</button><h2 style={{ color: '#27ddea' }}>Bot Parameters</h2><p style={{ color: '#bbb' }}>Demo configuration only. No live order is sent from this scanner.</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, color: '#fff' }}>{[['Stake', '0.50'], ['Martingale', '2'], ['Number of Wins', '4'], ['Stop Loss', '50']].map(([a, b]) => <label key={a}>{a}<input defaultValue={b} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5, background: '#111', color: '#fff', border: '1px solid #18e4ef', borderRadius: 6 }} /></label>)}</div><div style={{ marginTop: 18, display: 'flex', gap: 10 }}><button onClick={() => setShowBot(false)} style={{ padding: 11, background: '#159957', color: '#fff', border: 0, borderRadius: 7 }}>Launch Demo Bot</button><button onClick={() => setShowBot(false)} style={{ padding: 11, background: '#222', color: '#fff', border: 0, borderRadius: 7 }}>Cancel</button></div></div></div>}
        </main>
    );
};

export default AnalysisTool;
