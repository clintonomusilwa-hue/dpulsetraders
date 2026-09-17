import React, { useEffect, useMemo, useState } from 'react';
import { DIGIT_MARKETS, digitFromQuote } from '@/utils/digit-trading-config';

const CONTRACTS = [
    ['DIGITMATCH', 'Matches / Differs', '🎯'], ['DIGITEVEN', 'Even / Odd', '◉'], ['DIGITOVER', 'Over / Under', '↗'],
    ['CALLPUT', 'Higher / Lower', '↕'], ['TOUCH', 'Touch / No Touch', '⌁'], ['MULT', 'Multipliers', '✕'], ['TURBO', 'Turbos', '⚡'], ['CALLPUTV', 'Call / Put', '↗'],
] as const;

const ManualTrader = () => {
    const [symbol, setSymbol] = useState('1HZ100V');
    const [digits, setDigits] = useState<number[]>([]);
    const [quote, setQuote] = useState('—');
    const [pip, setPip] = useState<number | undefined>();
    const [live, setLive] = useState(false);
    const [type, setType] = useState('DIGITEVEN');
    const [barrier, setBarrier] = useState('5');
    const [duration, setDuration] = useState('1');
    const [stake, setStake] = useState('0.50');
    const [review, setReview] = useState(false);
    const [message, setMessage] = useState('');
    const [showTypes, setShowTypes] = useState(false);

    useEffect(() => {
        let active = true;
        const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        ws.onopen = () => {
            if (!active) return;
            setLive(true);
            ws.send(JSON.stringify({ ticks_history: symbol, count: 120, end: 'latest', style: 'ticks', req_id: 1 }));
            ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: 2 }));
        };
        ws.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                if (data.msg_type === 'history' && Array.isArray(data.history?.prices)) {
                    setPip(data.history.pip_size);
                    setDigits(data.history.prices.map((p: number) => digitFromQuote(p, data.history.pip_size)).slice(-120));
                    setQuote(String(data.history.prices.at(-1)));
                }
                if (data.msg_type === 'tick' && data.tick?.quote !== undefined) {
                    setPip(data.tick.pip_size);
                    setQuote(String(data.tick.quote));
                    setDigits(current => [...current, digitFromQuote(Number(data.tick.quote), data.tick.pip_size)].slice(-120));
                }
            } catch { /* ignore malformed public feed packets */ }
        };
        ws.onerror = () => active && setLive(false);
        ws.onclose = () => active && setLive(false);
        return () => { active = false; ws.close(); };
    }, [symbol]);

    const counts = useMemo(() => Array.from({ length: 10 }, (_, d) => digits.filter(x => x === d).length), [digits]);
    const latest = digits.at(-1);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const even = digits.length ? (digits.filter(d => d % 2 === 0).length / digits.length) * 100 : 50;
    const odd = 100 - even;
    const name = DIGIT_MARKETS.find(x => x[0] === symbol)?.[1] || symbol;
    const selected = CONTRACTS.find(x => x[0] === type)?.[1] || 'Even / Odd';
    const card: React.CSSProperties = { background: 'var(--general-section-1,#fff)', border: '1px solid var(--general-section-2,#d9dee7)', borderRadius: 14, padding: 14 };
    const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 8, border: '1px solid #c7ced8', background: 'var(--general-section-1,#fff)', color: 'var(--text-prominent,#172033)' };

    return <main style={{ minHeight: '100%', padding: '14px 12px 100px', background: 'var(--general-main-1,#fff)', color: 'var(--text-prominent,#172033)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <section style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div><small style={{ opacity: .6, fontWeight: 800 }}>MANUAL TRADING • DIGITS</small><h1 style={{ margin: '5px 0 2px' }}>Manual Trader</h1><span style={{ color: live ? '#159957' : '#c0392b', fontWeight: 800 }}>● {live ? 'LIVE TICK STREAM' : 'CONNECTING'}</span></div>
                <button onClick={() => setShowTypes(true)} style={{ border: '1px solid #b8c1cf', background: 'var(--general-section-1,#fff)', borderRadius: 9, padding: '11px 16px', fontWeight: 800 }}>Trade types ☰</button>
            </section>

            <section style={{ ...card, marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                    <label style={{ fontWeight: 800 }}>Volatility<select value={symbol} onChange={e => setSymbol(e.target.value)} style={{ ...input, marginTop: 6 }}>{DIGIT_MARKETS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select></label>
                    <label style={{ fontWeight: 800 }}>Trade type<select value={type} onChange={e => setType(e.target.value)} style={{ ...input, marginTop: 6 }}>{CONTRACTS.slice(0, 3).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
                </div>
                <div style={{ marginTop: 10, textAlign: 'center' }}><small style={{ opacity: .6 }}>CURRENT TICK</small><div style={{ fontSize: 28, fontWeight: 900, color: '#43b5d8' }}>{quote}</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 9, marginTop: 14 }}>
                    {Array.from({ length: 10 }, (_, d) => {
                        const pct = digits.length ? (counts[d] / digits.length) * 100 : 0;
                        const highest = counts[d] === maxCount && maxCount > 0;
                        const lowest = counts[d] === minCount && minCount < maxCount;
                        const barrierDigit = Number(barrier) === d;
                        const active = d === latest;
                        const arc = barrierDigit ? '#9b59ff' : highest ? '#19c875' : lowest ? '#ed4d5a' : '#43b5d8';
                        return <div key={d} style={{ textAlign: 'center' }}>
                            <div style={{ width: 58, height: 58, maxWidth: '100%', margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(${arc} 0 290deg,#e8edf2 290deg 360deg)`, boxShadow: active ? `0 0 0 5px ${arc}33` : undefined }}>
                                <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: active ? '#13243c' : '#fff', color: active ? '#fff' : '#222', fontWeight: 900, fontSize: 19, position: 'relative' }}>{d}{active && <span style={{ position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 17, color: '#e44' }}>▲</span>}</div>
                            </div><small style={{ fontWeight: 800 }}>{pct.toFixed(1)}%</small>
                        </div>;
                    })}
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 13, paddingBottom: 3 }}>{digits.slice(-12).map((d, i) => <span key={`${i}-${d}`} style={{ minWidth: 36, textAlign: 'center', padding: '7px 5px', borderRadius: 7, background: d % 2 === 0 ? '#51b7b1' : '#ef5555', color: '#fff', fontWeight: 900 }}>{d}</span>)}</div>
                <div style={{ marginTop: 10, display: 'flex', minHeight: 38, borderRadius: 8, overflow: 'hidden', fontWeight: 900, color: '#fff' }}><div style={{ width: `${even}%`, background: '#4eb5b1', padding: 9 }}>Even {even.toFixed(1)}%</div><div style={{ flex: 1, background: '#e84c4c', padding: 9, textAlign: 'right' }}>Odd {odd.toFixed(1)}%</div></div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: .65 }}>Arc legend: <b style={{ color: '#19c875' }}>highest</b> • <b style={{ color: '#ed4d5a' }}>lowest</b> • <b style={{ color: '#9b59ff' }}>barrier</b>. Barrier takes visual priority when it is also highest/lowest.</div>
            </section>

            <section style={{ ...card, marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9 }}><label>Barrier<select value={barrier} onChange={e => setBarrier(e.target.value)} style={{ ...input, marginTop: 5 }}>{Array.from({ length: 10 }, (_, d) => <option key={d}>{d}</option>)}</select></label><label>Ticks<input value={duration} onChange={e => setDuration(e.target.value)} type='number' min='1' max='10' style={{ ...input, marginTop: 5 }} /></label><label>Stake<input value={stake} onChange={e => setStake(e.target.value)} type='number' min='0.35' step='0.01' style={{ ...input, marginTop: 5 }} /></label></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}><button onClick={() => { setReview(true); setMessage(''); }} style={{ padding: 15, border: 0, borderRadius: 9, background: '#4eb5b1', color: '#fff', fontWeight: 900 }}>Even / {even.toFixed(1)}%</button><button onClick={() => { setReview(true); setMessage(''); }} style={{ padding: 15, border: 0, borderRadius: 9, background: '#e84c4c', color: '#fff', fontWeight: 900 }}>Odd / {odd.toFixed(1)}%</button></div>
                <button onClick={() => { setReview(true); setMessage(''); }} style={{ width: '100%', marginTop: 9, padding: 13, border: '1px solid #c7ced8', borderRadius: 9, background: 'var(--general-section-2,#f2f4f6)', fontWeight: 900 }}>Review {selected}</button>
                {review && <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: '#fff8e6', border: '1px solid #e9ce7b' }}><strong>Trade review</strong><div style={{ marginTop: 7 }}>{name} • {selected} • {duration} tick(s) • ${stake} stake • barrier {barrier}</div><div style={{ marginTop: 9, display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => setMessage('Safe simulation complete. No live order was sent.')} style={{ padding: '10px 14px', border: 0, borderRadius: 8, background: '#159957', color: '#fff', fontWeight: 900 }}>Safe simulation</button><button onClick={() => setReview(false)} style={{ padding: '10px 14px', border: 0, borderRadius: 8 }}>Edit</button></div>{message && <div style={{ marginTop: 8, color: '#159957', fontWeight: 800 }}>{message}</div>}</div>}
            </section>
        </div>
        {showTypes && <div onClick={() => setShowTypes(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.62)' }}><aside onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(430px,94vw)', overflowY: 'auto', background: '#101010', color: '#fff', padding: '18px 20px', boxSizing: 'border-box' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2>Trade types</h2><button onClick={() => setShowTypes(false)} style={{ background: 'none', color: '#fff', border: 0, fontSize: 30 }}>×</button></div><div style={{ padding: 16, background: '#181818', borderRadius: 8, marginBottom: 25 }}>Learn more about trade types <span style={{ float: 'right' }}>›</span></div>{[['Digits', CONTRACTS.slice(0, 3)], ['Ups & Downs', CONTRACTS.slice(3, 4)], ['Touch & No Touch', CONTRACTS.slice(4, 5)], ['Multipliers', CONTRACTS.slice(5, 6)], ['Turbos', CONTRACTS.slice(6, 7)], ['Vanillas', CONTRACTS.slice(7, 8)]].map(([group, items]) => <div key={String(group)} style={{ marginBottom: 34 }}><h3>{String(group)}</h3>{(items as readonly (readonly string[])[]).map(([v, n, icon]) => <button key={v} onClick={() => { if (v === 'DIGITMATCH' || v === 'DIGITEVEN' || v === 'DIGITOVER') setType(v); setShowTypes(false); }} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '13px 0', background: 'none', color: '#ddd', border: 0, textAlign: 'left', fontSize: 18 }}><span style={{ width: 42, height: 36, display: 'grid', placeItems: 'center', background: '#1b2025', borderRadius: 7, color: '#ff5260', fontWeight: 900 }}>{icon}</span>{n}</button>)}</div>)}</aside></div>}
    </main>;
};

export default ManualTrader;
