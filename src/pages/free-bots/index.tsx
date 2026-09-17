import React, { useEffect, useMemo, useState } from 'react';
import { DIGIT_BOTS, DIGIT_MARKETS, digitFromQuote, evaluateDigitBot, type DigitBotDefinition } from '@/utils/digit-trading-config';

type LiveState = Record<string, number[]>;

const FreeBots = () => {
    const [live, setLive] = useState<LiveState>({});
    const [selected, setSelected] = useState(DIGIT_BOTS[0].id);
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const sockets: WebSocket[] = [];
        DIGIT_MARKETS.forEach(([symbol]) => {
            const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089'); sockets.push(ws);
            ws.onopen = () => {
                ws.send(JSON.stringify({ ticks_history: symbol, count: 120, end: 'latest', style: 'ticks', req_id: 1 }));
                ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: 2 }));
            };
            ws.onmessage = event => {
                try {
                    const packet = JSON.parse(event.data);
                    if (packet.msg_type === 'history' && Array.isArray(packet.history?.prices)) {
                        setLive(prev => ({ ...prev, [symbol]: packet.history.prices.map((q: number) => digitFromQuote(q, packet.history.pip_size)).slice(-120) }));
                    }
                    if (packet.msg_type === 'tick' && packet.tick?.quote !== undefined) {
                        const d = digitFromQuote(Number(packet.tick.quote), packet.tick.pip_size);
                        setLive(prev => ({ ...prev, [symbol]: [...(prev[symbol] || []), d].slice(-120) }));
                    }
                } catch { /* ignore malformed public feed packets */ }
            };
        });
        return () => sockets.forEach(ws => ws.close());
    }, []);

    const bot = DIGIT_BOTS.find(b => b.id === selected) || DIGIT_BOTS[0];
    const evaluations = useMemo(() => DIGIT_MARKETS.map(([symbol, name]) => ({ symbol, name, ...evaluateDigitBot(bot, live[symbol] || []) })).filter(x => x.signal !== 'WAIT').sort((a, b) => b.confidence - a.confidence), [bot, live]);
    const best = evaluations[0];

    const loadBot = (definition: DigitBotDefinition) => {
        localStorage.setItem('dpulse_bot_config', JSON.stringify(definition));
        setSelected(definition.id); setMessage(`${definition.name} loaded into the Quick Bot workspace.`);
        window.setTimeout(() => { window.location.href = '/quick-bot'; }, 250);
    };
    const runDemo = () => { setRunning(true); setMessage(`${bot.name} is running in live-signal demo mode. It will not place a real order.`); };
    const stopDemo = () => { setRunning(false); setMessage(`${bot.name} demo stopped.`); };

    return <main style={{ minHeight: '100%', background: 'radial-gradient(circle at 50% 20%,#10255b 0,#030b24 48%,#02091c 100%)', color: '#fff', padding: '28px 14px 100px' }}><div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <section style={{ textAlign: 'center', padding: '20px 10px 30px' }}><h1 style={{ fontSize: 'clamp(38px,7vw,72px)', margin: '0 0 10px', fontWeight: 900 }}>Free & <span style={{ color: '#22d9ee' }}>Premium bots</span></h1><p style={{ opacity: .72, maxWidth: 760, margin: '0 auto', fontSize: 16 }}>Ready-coded digit strategies with live market analysis. Load a strategy into Quick Bot, inspect its rules, then test it in demo mode.</p></section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>{DIGIT_BOTS.map((b, i) => <button key={b.id} onClick={() => { setSelected(b.id); setMessage(''); }} style={{ minHeight: 250, textAlign: 'left', position: 'relative', background: 'rgba(4,17,43,.92)', border: `2px solid ${b.id === selected ? (b.tier === 'Premium' ? '#e8d11c' : '#25b9ff') : '#174b75'}`, borderRadius: 20, color: '#fff', padding: 22, boxShadow: b.id === selected ? '0 0 28px rgba(35,210,255,.16)' : 'none' }}><span style={{ position: 'absolute', right: 12, top: 12, border: `1px solid ${b.tier === 'Premium' ? '#e8d11c' : '#25b9ff'}`, padding: '6px 9px', borderRadius: 9, color: b.tier === 'Premium' ? '#e8d11c' : '#25b9ff', fontWeight: 900 }}>{b.tier}</span><div style={{ fontSize: 48 }}>🤖</div><strong style={{ color: b.tier === 'Premium' ? '#e8d11c' : '#25b9ff' }}>0{i + 1} • DIGIT BOT</strong><h2 style={{ margin: '8px 0' }}>{b.name}</h2><p style={{ opacity: .7, marginBottom: 0 }}>{b.description}</p></button>)}</div>
        <section style={{ marginTop: 18, padding: 22, border: '1px solid #146c91', borderRadius: 20, background: 'rgba(2,19,44,.94)' }}><div style={{ color: '#22d9ee', fontWeight: 900, letterSpacing: 2 }}>SELECTED BOT</div><h2 style={{ marginBottom: 5 }}>{bot.name}</h2><p style={{ opacity: .75 }}>{bot.description}</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>{[['Contract', bot.contract], ['Barrier', String(bot.barrier)], ['Lookback', `${bot.lookback} ticks`], ['Min score', `${bot.minConfidence}`]].map(([a, b]) => <div key={a} style={{ padding: 12, border: '1px solid #174b75', borderRadius: 10 }}><small style={{ opacity: .6 }}>{a}</small><div style={{ fontWeight: 900, marginTop: 3 }}>{b}</div></div>)}</div><div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 16 }}><button onClick={() => loadBot(bot)} style={{ padding: '13px 18px', border: 0, borderRadius: 10, background: '#16b8e9', color: '#03142d', fontWeight: 900 }}>Load into Quick Bot</button><button onClick={running ? stopDemo : runDemo} style={{ padding: '13px 18px', border: '1px solid #27d9b1', borderRadius: 10, background: running ? '#6e1e2b' : '#0c6e58', color: '#fff', fontWeight: 900 }}>{running ? 'Stop Demo' : 'Run Live-Signal Demo'}</button></div>{message && <div style={{ marginTop: 12, color: '#4de6b0', fontWeight: 800 }}>{message}</div>}</section>
        <section style={{ marginTop: 18, padding: 20, border: '1px solid #174b75', borderRadius: 18, background: 'rgba(4,20,45,.86)' }}><h2 style={{ marginTop: 0 }}>Live candidate markets for {bot.name}</h2>{best ? <div style={{ padding: 14, border: '1px solid #19c875', borderRadius: 12, background: 'rgba(25,200,117,.08)' }}><b>{best.name}</b> • {best.signal} • score {best.confidence}<div style={{ opacity: .7, marginTop: 5 }}>{best.reason}</div></div> : <p style={{ opacity: .65 }}>Waiting for enough live ticks to evaluate the strategy across all volatility markets.</p>}<div style={{ marginTop: 12, display: 'grid', gap: 7 }}>{evaluations.slice(0, 5).map(r => <div key={r.symbol} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 8, padding: 9, borderTop: '1px solid #173b5c' }}><span>{r.name}</span><span>{r.signal}</span><b>{r.confidence}</b></div>)}</div></section>
        <p style={{ textAlign: 'center', opacity: .55, marginTop: 18, fontSize: 12 }}>These are rule-based statistical strategies, not guaranteed-profit bots. Demo mode does not send buy orders.</p>
    </div></main>;
};
export default FreeBots;
