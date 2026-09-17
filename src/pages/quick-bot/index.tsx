import React, { useEffect, useMemo, useState } from 'react';
import { DIGIT_BOTS, DIGIT_MARKETS, digitFromQuote, evaluateDigitBot, type DigitBotDefinition } from '@/utils/digit-trading-config';

const QuickBot = () => {
    const [market, setMarket] = useState('1HZ15V');
    const [botId, setBotId] = useState(DIGIT_BOTS[0].id);
    const [stake, setStake] = useState('0.50');
    const [martingale, setMartingale] = useState('2');
    const [wins, setWins] = useState('4');
    const [stopLoss, setStopLoss] = useState('50');
    const [digits, setDigits] = useState<number[]>([]);
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        try {
            const saved = localStorage.getItem('dpulse_bot_config');
            if (saved) { const config = JSON.parse(saved) as DigitBotDefinition; if (config?.id) setBotId(config.id); localStorage.removeItem('dpulse_bot_config'); }
        } catch { /* ignore malformed saved config */ }
    }, []);

    useEffect(() => {
        let active = true;
        const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        ws.onopen = () => { ws.send(JSON.stringify({ ticks_history: market, count: 120, end: 'latest', style: 'ticks', req_id: 1 })); ws.send(JSON.stringify({ ticks: market, subscribe: 1, req_id: 2 })); };
        ws.onmessage = event => {
            try {
                const packet = JSON.parse(event.data);
                if (packet.msg_type === 'history' && Array.isArray(packet.history?.prices)) setDigits(packet.history.prices.map((q: number) => digitFromQuote(q, packet.history.pip_size)).slice(-120));
                if (packet.msg_type === 'tick' && packet.tick?.quote !== undefined) setDigits(prev => [...prev, digitFromQuote(Number(packet.tick.quote), packet.tick.pip_size)].slice(-120));
            } catch { /* ignore malformed public feed packets */ }
        };
        return () => { active = false; ws.close(); };
    }, [market]);

    const bot = DIGIT_BOTS.find(b => b.id === botId) || DIGIT_BOTS[0];
    const evaluation = useMemo(() => evaluateDigitBot(bot, digits), [bot, digits]);
    const name = DIGIT_MARKETS.find(x => x[0] === market)?.[1] || market;

    const start = () => { setRunning(true); setMessage(`${bot.name} started in live-signal demo mode on ${name}. No live order was sent.`); };
    const stop = () => { setRunning(false); setMessage(`${bot.name} stopped.`); };

    return <main style={{ minHeight: '100%', background: 'radial-gradient(circle at 50% 0,#152c62,#030b20 60%)', color: '#fff', padding: '25px 14px 100px' }}><div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header><small style={{ color: '#26ddec', fontWeight: 900, letterSpacing: 2 }}>QUICK BOT</small><h1 style={{ fontSize: 40, margin: '8px 0' }}>Load and run a digit bot</h1><p style={{ opacity: .7 }}>Every bot uses live digit data and the shared volatility list.</p></header>
        <section style={{ marginTop: 18, padding: 20, border: '1px solid #17638b', borderRadius: 18, background: 'rgba(3,18,42,.94)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>Bot<select value={botId} onChange={e => setBotId(e.target.value)} style={input}>{DIGIT_BOTS.map(b => <option key={b.id} value={b.id}>{b.name} • {b.tier}</option>)}</select></label>
                <label>Volatility<select value={market} onChange={e => setMarket(e.target.value)} style={input}>{DIGIT_MARKETS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
                <label>Stake<input value={stake} onChange={e => setStake(e.target.value)} type='number' min='.35' step='.01' style={input} /></label><label>Martingale<input value={martingale} onChange={e => setMartingale(e.target.value)} type='number' min='1' step='.1' style={input} /></label>
                <label>Number of wins (stop after)<input value={wins} onChange={e => setWins(e.target.value)} type='number' min='1' style={input} /></label><label>Stop loss<input value={stopLoss} onChange={e => setStopLoss(e.target.value)} type='number' min='1' style={input} /></label>
            </div>
            <div style={{ marginTop: 18, padding: 18, border: '1px solid #1b5273', borderRadius: 12, background: '#07172e' }}><h2 style={{ marginTop: 0 }}>{bot.name}</h2><p>{bot.description}</p><p><b>Live evaluation:</b> {evaluation.signal} {evaluation.confidence ? `• score ${evaluation.confidence}` : ''}</p><small style={{ opacity: .7 }}>{evaluation.reason}</small></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}><button onClick={running ? stop : start} style={{ padding: '13px 22px', border: 0, borderRadius: 9, background: running ? '#7b2633' : '#15b8e7', fontWeight: 900, color: '#fff' }}>{running ? 'Stop Demo Bot' : 'Start Demo Bot'}</button><button onClick={() => { setMessage('Bot settings are loaded and ready.'); }} style={{ padding: '13px 22px', border: '1px solid #3d607d', borderRadius: 9, background: '#07172e', color: '#fff', fontWeight: 900 }}>Save Setup</button></div>{message && <div style={{ marginTop: 12, color: '#46e5b0', fontWeight: 800 }}>{message}</div>}
        </section>
        <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>{[['01', 'Live feed', `${digits.length} ticks loaded`], ['02', 'Strategy', bot.contract], ['03', 'Minimum score', String(bot.minConfidence)]].map(([n, t, d]) => <div key={n} style={{ padding: 18, border: '1px solid #174b75', borderRadius: 14, background: 'rgba(4,20,45,.8)' }}><b style={{ color: '#24dced' }}>{n}</b><h3>{t}</h3><p style={{ opacity: .65 }}>{d}</p></div>)}</section>
        <p style={{ opacity: .55, textAlign: 'center', marginTop: 18, fontSize: 12 }}>Demo mode only: this page does not call Deriv buy. No strategy can guarantee the next digit.</p>
    </div></main>;
};
const input: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', padding: 11, marginTop: 5, borderRadius: 8, border: '1px solid #27708e', background: '#07152b', color: '#fff' };
export default QuickBot;
