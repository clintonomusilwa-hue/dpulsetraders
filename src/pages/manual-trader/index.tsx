import React, { useMemo, useState } from 'react';

const markets = [
    ['1HZ10V', 'Volatility 10 (1s) Index'],
    ['1HZ15V', 'Volatility 15 (1s) Index'],
    ['1HZ25V', 'Volatility 25 (1s) Index'],
    ['1HZ50V', 'Volatility 50 (1s) Index'],
    ['1HZ75V', 'Volatility 75 (1s) Index'],
    ['1HZ100V', 'Volatility 100 (1s) Index'],
];

const ManualTrader = () => {
    const [symbol, setSymbol] = useState('1HZ15V');
    const [contract, setContract] = useState('CALL');
    const [duration, setDuration] = useState('1');
    const [unit, setUnit] = useState('Ticks');
    const [stake, setStake] = useState('1');
    const [step, setStep] = useState<'configure' | 'review'>('configure');
    const [message, setMessage] = useState('');
    const selected = useMemo(() => markets.find(([value]) => value === symbol)?.[1] || symbol, [symbol]);
    const valid = Number(stake) > 0 && Number(duration) > 0;

    const card: React.CSSProperties = { background: 'var(--general-section-1, #fff)', border: '1px solid var(--general-section-2, #e5e7eb)', borderRadius: 16, padding: 20 };
    const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'transparent' };
    const button: React.CSSProperties = { border: 0, borderRadius: 10, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' };

    const review = (event: React.FormEvent) => { event.preventDefault(); setMessage(''); if (valid) setStep('review'); };
    const simulate = () => setMessage('Simulation complete. No trade was sent to Deriv and no account balance was changed.');

    return (
        <main style={{ padding: '28px 18px 80px', maxWidth: 1050, margin: '0 auto' }}>
            <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
                <div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', opacity: .65 }}>Trading workspace</div><h1 style={{ margin: '8px 0' }}>Manual Trader</h1><p style={{ margin: 0, opacity: .75 }}>Configure one contract, review it, then run a safe simulation.</p></div>
                <span style={{ alignSelf: 'center', padding: '8px 12px', borderRadius: 999, background: '#e8f7ee', color: '#18794e', fontWeight: 800 }}>● Simulation mode</span>
            </section>
            <div style={{ ...card, marginBottom: 18, background: '#fff8e6', borderColor: '#f1d58a' }}><strong>No live orders</strong><div style={{ marginTop: 5, opacity: .8 }}>This workspace never calls a buy or proposal action. It is for configuration and safe review.</div></div>
            <section style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div><small style={{ opacity: .6 }}>Step {step === 'configure' ? '1 of 2' : '2 of 2'}</small><h2 style={{ margin: '5px 0 0' }}>{step === 'configure' ? 'Configure trade' : 'Review trade'}</h2></div><strong style={{ opacity: .65 }}>{selected}</strong></div>
                {step === 'configure' ? <form onSubmit={review}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 }}>
                        <label>Market / symbol<select style={input} value={symbol} onChange={e => setSymbol(e.target.value)}>{markets.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}</select></label>
                        <label>Direction<select style={input} value={contract} onChange={e => setContract(e.target.value)}><option value='CALL'>Rise / CALL</option><option value='PUT'>Fall / PUT</option></select></label>
                        <label>Duration<input style={input} type='number' min='1' step='1' value={duration} onChange={e => setDuration(e.target.value)} /></label>
                        <label>Unit<select style={input} value={unit} onChange={e => setUnit(e.target.value)}><option>Ticks</option><option>Seconds</option><option>Minutes</option></select></label>
                        <label>Stake (USD)<input style={input} type='number' min='0.01' step='0.01' value={stake} onChange={e => setStake(e.target.value)} /></label>
                    </div>
                    {!valid && <p style={{ color: '#b42318' }}>Enter a duration and stake greater than zero.</p>}
                    <button type='submit' disabled={!valid} style={{ ...button, marginTop: 20, opacity: valid ? 1 : .5 }}>Review trade</button>
                </form> : <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>{[['Market', selected], ['Symbol', symbol], ['Direction', contract === 'CALL' ? 'Rise / CALL' : 'Fall / PUT'], ['Duration', `${duration} ${unit}`], ['Stake', `${stake} USD`]].map(([a,b]) => <div key={a} style={{ padding: 14, borderRadius: 10, background: '#f6f7f9' }}><small style={{ opacity: .6 }}>{a}</small><div style={{ fontWeight: 800, marginTop: 4 }}>{b}</div></div>)}</div>
                    <p style={{ opacity: .75 }}>Review complete. The action below is simulation-only.</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button onClick={simulate} style={{ ...button, background: '#18794e', color: '#fff' }}>Run safe simulation</button><button onClick={() => { setStep('configure'); setMessage(''); }} style={{ ...button, background: '#eef1f5' }}>Edit trade</button></div>
                </div>}
                {message && <div role='status' style={{ marginTop: 18, padding: 14, borderRadius: 10, background: '#e8f7ee', color: '#18794e', fontWeight: 700 }}>{message}</div>}
            </section>
        </main>
    );
};

export default ManualTrader;
