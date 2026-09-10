import React, { useEffect, useMemo, useState } from 'react';

const DIGIT_SYMBOLS = [
    ['1HZ10V', 'Volatility 10 (1s)'],
    ['1HZ15V', 'Volatility 15 (1s)'],
    ['1HZ25V', 'Volatility 25 (1s)'],
    ['1HZ50V', 'Volatility 50 (1s)'],
    ['1HZ75V', 'Volatility 75 (1s)'],
    ['1HZ100V', 'Volatility 100 (1s)'],
];

const MAX_DIGITS = 24;

const ManualTrader = () => {
    const [symbol, setSymbol] = useState('1HZ15V');
    const [digits, setDigits] = useState<number[]>([]);
    const [lastDigit, setLastDigit] = useState<number | null>(null);
    const [quote, setQuote] = useState('—');
    const [status, setStatus] = useState('Connecting to live digits…');
    const [contract, setContract] = useState('DIGITOVER');
    const [barrier, setBarrier] = useState('5');
    const [stake, setStake] = useState('1');
    const [duration, setDuration] = useState('1');
    const [step, setStep] = useState<'live' | 'review'>('live');
    const [simulation, setSimulation] = useState('');

    useEffect(() => {
        let socket: WebSocket | null = null;
        let active = true;

        const connect = () => {
            socket = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
            socket.onopen = () => {
                if (!active) return;
                setStatus('LIVE • receiving ticks');
                socket?.send(JSON.stringify({ ticks_history: symbol, end: 'latest', count: 24, style: 'ticks', req_id: 1 }));
                socket?.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: 2 }));
            };
            socket.onmessage = event => {
                if (!active) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data.error) {
                        setStatus('Live feed error');
                        return;
                    }
                    if (data.msg_type === 'history' && Array.isArray(data.history?.prices)) {
                        const historyDigits = data.history.prices.map((price: number) => getLastDigit(price, data.history.pip_size)).filter((d: number | null): d is number => d !== null);
                        setDigits(historyDigits.slice(-MAX_DIGITS));
                        if (historyDigits.length) setLastDigit(historyDigits[historyDigits.length - 1]);
                    }
                    if (data.msg_type === 'tick' && data.tick?.quote !== undefined) {
                        const digit = getLastDigit(data.tick.quote, data.tick.pip_size);
                        setQuote(String(data.tick.quote));
                        if (digit !== null) {
                            setLastDigit(digit);
                            setDigits(current => [...current, digit].slice(-MAX_DIGITS));
                        }
                    }
                } catch {
                    setStatus('Live feed data error');
                }
            };
            socket.onerror = () => active && setStatus('Unable to connect to live digits');
            socket.onclose = () => {
                if (active) setStatus('Live feed disconnected — reconnecting…');
            };
        };

        const reconnect = window.setTimeout(connect, 50);
        return () => {
            active = false;
            window.clearTimeout(reconnect);
            if (socket?.readyState === WebSocket.OPEN) socket.close();
            else socket?.close();
        };
    }, [symbol]);

    const counts = useMemo(() => Array.from({ length: 10 }, (_, digit) => digits.filter(item => item === digit).length), [digits]);
    const selectedLabel = DIGIT_SYMBOLS.find(([value]) => value === symbol)?.[1] || symbol;
    const contractLabel = { DIGITOVER: 'Over', DIGITUNDER: 'Under', DIGITEVEN: 'Even', DIGITODD: 'Odd' }[contract];

    const card: React.CSSProperties = { background: 'var(--general-section-1, #fff)', border: '1px solid var(--general-section-2, #e5e7eb)', borderRadius: 16, padding: 18 };
    const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid #b8c2cf', background: 'transparent' };
    const button: React.CSSProperties = { border: 0, borderRadius: 10, padding: '12px 18px', fontWeight: 800, cursor: 'pointer' };

    const review = (event: React.FormEvent) => {
        event.preventDefault();
        setSimulation('');
        setStep('review');
    };

    const simulate = () => setSimulation('Simulation complete. No proposal, buy, or live trade was sent to Deriv.');

    return (
        <main style={{ padding: '24px 16px 90px', maxWidth: 1100, margin: '0 auto' }}>
            <style>{`@keyframes digitCursor {0%,100%{transform:translateX(-8px)}50%{transform:translateX(8px)}} @keyframes digitPulse {0%,100%{box-shadow:0 0 0 0 rgba(28,126,82,.12)}50%{box-shadow:0 0 0 8px rgba(28,126,82,.02)}} .digit-circle{animation:digitPulse 1.8s ease-in-out infinite}.digit-arrow{animation:digitCursor 1.1s ease-in-out infinite}`}</style>

            <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 15, flexWrap: 'wrap', marginBottom: 18 }}>
                <div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', opacity: .6 }}>DIGITS TRADING WORKSPACE</div><h1 style={{ margin: '7px 0' }}>Manual Trader</h1><p style={{ margin: 0, opacity: .72 }}>Live digit stream for Over, Under, Even and Odd.</p></div>
                <span style={{ padding: '8px 12px', borderRadius: 999, background: '#e8f7ee', color: '#18794e', fontWeight: 800 }}>● Simulation mode</span>
            </section>

            <section style={{ ...card, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div><strong>Live digits</strong><div style={{ fontSize: 13, opacity: .65, marginTop: 4 }}>{status}</div></div>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)} style={{ ...input, width: 250 }}>{DIGIT_SYMBOLS.map(([value, label]) => <option key={value} value={value}>{label} • {value}</option>)}</select>
                </div>
                <div style={{ marginTop: 18, display: 'flex', gap: 10, overflowX: 'auto', padding: '10px 6px 18px' }}>
                    {Array.from({ length: 10 }, (_, digit) => <div key={digit} style={{ minWidth: 58, textAlign: 'center' }}>
                        <div className='digit-circle' style={{ width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center', border: digit === lastDigit ? '3px solid #18794e' : '1px solid #b8c2cf', fontSize: 21, fontWeight: 900, position: 'relative' }}>{digit}{digit === lastDigit && <span className='digit-arrow' style={{ position: 'absolute', bottom: -20, fontSize: 18 }}>▲</span>}</div>
                        <small style={{ opacity: .6 }}>{counts[digit]}</small>
                    </div>)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #e5e7eb' }}><span style={{ opacity: .65 }}>Latest quote</span><strong style={{ fontSize: 20 }}>{quote}</strong><span style={{ padding: '7px 12px', borderRadius: 999, background: '#eef1f5' }}>Last digit: <strong>{lastDigit ?? '—'}</strong></span></div>
            </section>

            <section style={{ ...card, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><div><small style={{ opacity: .6 }}>Step {step === 'live' ? '1 of 2' : '2 of 2'}</small><h2 style={{ margin: '5px 0 0' }}>{step === 'live' ? 'Choose digit contract' : 'Review digit trade'}</h2></div><strong style={{ opacity: .65 }}>{selectedLabel}</strong></div>
                {step === 'live' ? <form onSubmit={review}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
                        <label>Contract<select style={input} value={contract} onChange={e => setContract(e.target.value)}><option value='DIGITOVER'>Over</option><option value='DIGITUNDER'>Under</option><option value='DIGITEVEN'>Even</option><option value='DIGITODD'>Odd</option></select></label>
                        {(contract === 'DIGITOVER' || contract === 'DIGITUNDER') && <label>Barrier (0–9)<select style={input} value={barrier} onChange={e => setBarrier(e.target.value)}>{Array.from({ length: 10 }, (_, n) => <option key={n}>{n}</option>)}</select></label>}
                        <label>Duration (ticks)<input style={input} type='number' min='1' max='10' value={duration} onChange={e => setDuration(e.target.value)} /></label>
                        <label>Stake (USD)<input style={input} type='number' min='0.01' step='0.01' value={stake} onChange={e => setStake(e.target.value)} /></label>
                    </div>
                    <button type='submit' style={{ ...button, marginTop: 18 }}>Review {contractLabel} trade</button>
                </form> : <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>{[['Asset', selectedLabel], ['Contract', contractLabel], ['Barrier', contract === 'DIGITOVER' || contract === 'DIGITUNDER' ? barrier : '—'], ['Duration', `${duration} tick(s)`], ['Stake', `${stake} USD`], ['Last digit', lastDigit === null ? '—' : String(lastDigit)]].map(([a,b]) => <div key={a} style={{ padding: 13, borderRadius: 10, background: '#f5f7f9' }}><small style={{ opacity: .6 }}>{a}</small><div style={{ fontWeight: 800, marginTop: 4 }}>{b}</div></div>)}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}><button onClick={simulate} style={{ ...button, background: '#18794e', color: '#fff' }}>Run safe simulation</button><button onClick={() => setStep('live')} style={{ ...button, background: '#eef1f5' }}>Edit trade</button></div>
                    {simulation && <div role='status' style={{ marginTop: 15, padding: 14, borderRadius: 10, background: '#e8f7ee', color: '#18794e', fontWeight: 700 }}>{simulation}</div>}
                </div>}
            </section>

            <div style={{ ...card, background: '#fff8e6', borderColor: '#f1d58a' }}><strong>No live orders</strong><div style={{ marginTop: 5, opacity: .8 }}>This Manual Trader currently reads public live ticks only. The simulation button does not request a proposal and cannot place a trade.</div></div>
        </main>
    );
};

const getLastDigit = (quote: number, pipSize?: number): number | null => {
    if (!Number.isFinite(quote)) return null;
    let decimals = 2;
    if (typeof pipSize === 'number' && pipSize > 0 && pipSize < 1) decimals = Math.max(0, Math.round(-Math.log10(pipSize)));
    const formatted = quote.toFixed(decimals);
    const digit = Number(formatted.replace(/[^0-9]/g, '').slice(-1));
    return Number.isInteger(digit) ? digit : null;
};

export default ManualTrader;
