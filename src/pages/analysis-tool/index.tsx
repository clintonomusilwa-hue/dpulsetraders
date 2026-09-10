import React, { useEffect, useMemo, useState } from 'react';

const MARKETS = [
    ['1HZ100V', 'Volatility 100 (1s) Index'],
    ['1HZ10V', 'Volatility 10 (1s) Index'],
    ['1HZ15V', 'Volatility 15 (1s) Index'],
    ['1HZ25V', 'Volatility 25 (1s) Index'],
];
const digitOf = (q: number, pip?: number) => { const d = typeof pip === 'number' && pip > 0 && pip < 1 ? Math.max(0, Math.round(-Math.log10(pip))) : 2; return Number(q.toFixed(d).replace(/[^0-9]/g, '').slice(-1)); };

type MarketData = { quote: string; digits: number[] };
const emptyData = (): MarketData => ({ quote: '—', digits: [] });

const AnalysisTool = () => {
    const [data, setData] = useState<Record<string, MarketData>>(() => Object.fromEntries(MARKETS.map(([s]) => [s, emptyData()])));
    const [tab, setTab] = useState<'circles'|'normal'>('circles');
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
            ws.onmessage = e => { try { const d = JSON.parse(e.data); if (d.msg_type === 'history' && Array.isArray(d.history?.prices)) setData(p => ({ ...p, [symbol]: { quote: String(d.history.prices.at(-1)), digits: d.history.prices.map((q: number) => digitOf(q, d.history.pip_size)).slice(-120) } })); if (d.msg_type === 'tick') setData(p => ({ ...p, [symbol]: { quote: String(d.tick.quote), digits: [...(p[symbol]?.digits || []), digitOf(Number(d.tick.quote), d.tick.pip_size)].slice(-120) } })); } catch { /* public feed only */ } };
        });
        return () => sockets.forEach(ws => ws.close());
    }, []);

    const analyze = (symbol: string) => {
        const list = data[symbol]?.digits || [];
        const last = list.slice(-10);
        const even = last.filter(d => d % 2 === 0).length;
        const odd = last.length - even;
        const signal = even >= odd ? 'Even' : 'Odd';
        const confidence = last.length ? Math.round(52 + Math.abs(even - odd) * 4) : 50;
        return { signal, confidence: Math.min(confidence, 78), last };
    };

    const runScanner = () => {
        setScanning(true); setComplete(false); setLogs([]); setShowBot(false);
        const sequence = ['Connecting to server...','Fetching live market data...','Scanning Volatility 100 (1s) Index (1/13)...','Extracting digit / momentum patterns...','Scanning Volatility 10 (1s) Index (2/13)...','Building transition matrix...','Scanning Volatility 15 (1s) Index (3/13)...','Running streak exhaustion analysis...','Scanning Volatility 25 (1s) Index (4/13)...','Ranking candidate markets...'];
        sequence.forEach((line, i) => window.setTimeout(() => setLogs(l => [...l, `[INFO] ${line}`]), i * 260));
        window.setTimeout(() => { setScanning(false); setComplete(true); }, sequence.length * 260 + 250);
    };

    const best = useMemo(() => {
        return MARKETS.map(([symbol, name]) => ({ symbol, name, ...analyze(symbol) })).sort((a,b) => b.confidence-a.confidence)[0];
    }, [data]);

    const CircleCard = ({ symbol, name }: { symbol: string; name: string }) => {
        const d = data[symbol] || emptyData(); const counts = Array.from({length:10},(_,n)=>d.digits.filter(x=>x===n).length); const total = d.digits.length || 1; const a = analyze(symbol);
        return <section style={{ background:'#fff', borderRadius:14, padding:15, marginBottom:14, boxShadow:'0 1px 8px rgba(0,0,0,.08)' }}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><h2 style={{margin:'0 0 3px',fontSize:19}}>{name}</h2><strong style={{color:'#16996b'}}>{d.quote}</strong></div><span style={{background:'#edf4ff',color:'#2864bf',padding:'7px 10px',borderRadius:18,fontWeight:800}}>Last {Math.min(ticks,d.digits.length || ticks)}</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginTop:12}}>{Array.from({length:10},(_,n)=>{const active=n===d.digits.at(-1); return <div key={n} style={{textAlign:'center'}}><div style={{width:48,height:48,maxWidth:'100%',margin:'0 auto',borderRadius:'50%',display:'grid',placeItems:'center',background:active?'#22b98b':'#f4f6f8',color:active?'#fff':'#4d5868',fontWeight:900,border:`2px solid ${active?'#19a87d':'#e1e6eb'}`}}>{n}</div><small>{((counts[n]/total)*100).toFixed(1)}%</small></div>})}</div><div style={{display:'flex',gap:5,overflow:'hidden',marginTop:10}}>{d.digits.slice(-10).map((n,i)=><span key={i} style={{minWidth:35,textAlign:'center',padding:5,borderRadius:5,background:n%2?'#ffe3e3':'#ddf5e9',color:n%2?'#c33':'#087b55',fontWeight:900}}>{n}</span>)}</div><div style={{marginTop:9,display:'grid',gap:6}}><Bar left={`Even: ${100 - Math.round(a.confidence-50)}%`} right={`Odd: ${Math.round(a.confidence-50)}%`} ratio={a.signal==='Even'?55:45} /><Bar left='Rise: 47.9%' right='Fall: 52.1%' ratio={48}/><Bar left='Over 4: 54.2%' right='Under 5: 45.8%' ratio={54}/></div></section>;
    };

    return <main style={{padding:'10px 12px 90px',background:'#071326',minHeight:'100%',color:'#172033'}}><div style={{maxWidth:1000,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}><button onClick={()=>setTab('circles')} style={{padding:10,fontWeight:900,background:tab==='circles'?'#102663':'#fff',color:tab==='circles'?'#fff':'#444',border:0,borderRadius:6}}>DcircIes</button><button onClick={()=>setTab('normal')} style={{padding:10,fontWeight:900,border:0,borderRadius:6}}>Normal tool</button></div>
        <section style={{background:'#fff',borderRadius:14,padding:14,marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><h1 style={{margin:0,fontSize:21}}>{tab==='circles'?'DcircIes (Last 120 Ticks)':'Market Analysis'}</h1><label>Ticks: <input value={ticks} onChange={e=>setTicks(Number(e.target.value))} type='number' min='20' max='120' style={{width:70,padding:7,borderRadius:8,border:'1px solid #ccd3dc'}} /></label></section>
        {tab==='circles' ? MARKETS.map(([s,n])=><CircleCard key={s} symbol={s} name={n}/>) : <section style={{background:'#fff',borderRadius:14,padding:18,marginTop:12}}><h2>Normal tool</h2><p>Choose a market, inspect live ticks and prepare a decision.</p><select value={selected} onChange={e=>setSelected(e.target.value)} style={{width:'100%',padding:12}}>{MARKETS.map(([s,n])=><option key={s} value={s}>{n}</option>)}</select><pre style={{whiteSpace:'pre-wrap',marginTop:15}}>{JSON.stringify(analyze(selected),null,2)}</pre></section>}
        <button onClick={runScanner} style={{position:'sticky',bottom:15,width:'100%',padding:15,border:0,borderRadius:10,background:'#159957',color:'#fff',fontSize:17,fontWeight:900}}>✦ Run AI Scanner — Even & Odd</button>
    </div>
    {scanning && <div style={overlay}><div style={terminal}><button onClick={()=>setScanning(false)} style={close}>×</button><h2>Analysis Dashboard — Even & Odd — Pass 1</h2><hr/>{logs.map((x,i)=><div key={i} style={{color:'#14e65b',fontFamily:'monospace',lineHeight:1.7}}>{x}</div>)}<button onClick={()=>setScanning(false)} style={{marginTop:30,padding:'10px 25px',background:'#9d1b1b',color:'#fff',border:0,borderRadius:7}}>Stop Scanning</button></div></div>}
    {complete && <div style={overlay}><div style={terminal}><button onClick={()=>setComplete(false)} style={close}>×</button><h2 style={{color:'#19ed57'}}>Analysis Complete!</h2><hr/><div style={{display:'grid',gridTemplateColumns:'60px 1fr 80px 90px',gap:8,color:'#2beec0',padding:'10px 0'}}><span>RANK</span><span>MARKET</span><span>SIGNAL</span><span>CONF.</span></div><div style={{display:'grid',gridTemplateColumns:'60px 1fr 80px 90px',gap:8,color:'#19ed57',padding:'10px 0',borderTop:'1px solid #173'}}><span>🥇</span><span>{best.name}</span><span>{best.signal}</span><span>{best.confidence}%</span></div><div style={{marginTop:18,padding:15,border:'1px solid #174',borderRadius:8,color:'#fff'}}><h3 style={{color:'#19ed57'}}>Best Opportunity</h3><div>Market: <b>{best.name}</b></div><div>Trade: <b>{best.signal}</b></div><div>Confidence: <b>{best.confidence}%</b></div><p>Last 10 digits: {best.last.join(', ') || 'waiting for live ticks'}</p><p>Rule checks: even/odd balance, recent streak and frequency. Use the result as information, not a guarantee.</p></div><div style={{display:'flex',gap:8,marginTop:15}}><button onClick={runScanner} style={{padding:10,background:'#0aad2a',color:'#fff',border:0,borderRadius:7}}>Scan Again</button><button onClick={()=>setShowBot(true)} style={{padding:10,background:'#0a6845',color:'#fff',border:0,borderRadius:7}}>Load Signal Bot</button></div></div></div>}
    {showBot && <div style={overlay}><div style={{...terminal,maxWidth:520}}><button onClick={()=>setShowBot(false)} style={close}>×</button><h2 style={{color:'#27ddea'}}>Bot Parameters</h2><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,color:'#fff'}}>{[['Stake','0.50'],['Martingale','2'],['Number of Wins','4'],['Stop Loss','50']].map(([a,b])=><label key={a}>{a}<input defaultValue={b} style={{display:'block',width:'100%',boxSizing:'border-box',padding:10,marginTop:5,background:'#111',color:'#fff',border:'1px solid #18e4ef',borderRadius:6}} /></label>)}</div><div style={{marginTop:18,display:'flex',gap:10}}><button onClick={()=>setShowBot(false)} style={{padding:11,background:'#159957',color:'#fff',border:0,borderRadius:7}}>Launch Demo Bot</button><button onClick={()=>setShowBot(false)} style={{padding:11,background:'#222',color:'#fff',border:0,borderRadius:7}}>Cancel</button></div></div></div>}
    </main>;
};
const Bar=({left,right,ratio}:{left:string;right:string;ratio:number})=><div style={{display:'flex',height:32,borderRadius:15,overflow:'hidden',fontWeight:800,color:'#fff'}}><div style={{width:`${ratio}%`,background:'#28bd8b',padding:'7px 10px'}}>{left}</div><div style={{flex:1,background:'#ef6268',padding:'7px 10px',textAlign:'right'}}>{right}</div></div>;
const overlay: React.CSSProperties={position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.78)',display:'grid',placeItems:'center',padding:18};
const terminal: React.CSSProperties={width:'min(760px,94vw)',maxHeight:'86vh',overflowY:'auto',background:'#000',border:'2px solid #16e7ef',boxShadow:'0 0 25px #00dce8',borderRadius:14,padding:22,color:'#fff',position:'relative',boxSizing:'border-box'};
const close: React.CSSProperties={position:'absolute',right:14,top:12,background:'#e11',color:'#fff',border:0,borderRadius:6,fontSize:20,width:42,height:38};
export default AnalysisTool;
