import React, { useState } from 'react';

const bots = [
    { title: 'LOAD BOT', name: 'Starter Bot Library', icon: '🤖', tone: '#25b9ff', desc: 'Load a ready strategy and inspect every rule before running it.' },
    { title: 'PREMIUM BOTS', name: 'Premium Strategies', icon: '🟡', tone: '#e8d11c', desc: 'Advanced templates for experienced traders.' },
    { title: 'SPEED BOT', name: 'Fast Digit Bot', icon: '🚀', tone: '#20d9e8', desc: 'Fast tick-based setup for digit markets.' },
    { title: 'MANUAL TRADING', name: 'Manual Digits Bot', icon: '☝', tone: '#b878ff', desc: 'Connect your digit analysis to a controlled manual workflow.' },
];

const FreeBots = () => {
    const [selected, setSelected] = useState(0);
    const [message, setMessage] = useState('');
    const bot = bots[selected];
    return <main style={{minHeight:'100%',background:'radial-gradient(circle at 50% 20%,#10255b 0,#030b24 48%,#02091c 100%)',color:'#fff',padding:'28px 14px 100px'}}><div style={{maxWidth:1050,margin:'0 auto'}}>
        <section style={{textAlign:'center',padding:'20px 10px 30px'}}><h1 style={{fontSize:'clamp(38px,7vw,72px)',margin:'0 0 10px',fontWeight:900}}>Free bots <span style={{color:'#22d9ee'}}>ready to load</span></h1><p style={{opacity:.72,maxWidth:720,margin:'0 auto',fontSize:16}}>Search ready strategies, open the rules, and move directly into the bot builder when you are ready to test.</p></section>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>{bots.map((b,i)=><button key={b.title} onClick={()=>{setSelected(i);setMessage('')}} style={{minHeight:270,textAlign:'center',position:'relative',background:'rgba(4,17,43,.92)',border:`2px solid ${i===selected?b.tone:'#174b75'}`,borderRadius:20,color:'#fff',boxShadow:i===selected?`0 0 28px ${b.tone}33`:'none'}}><span style={{position:'absolute',right:10,top:10,border:`1px solid ${b.tone}`,padding:'6px 9px',borderRadius:'0 0 9px 9px',color:b.tone,fontWeight:900}}>0{i+1}</span><div style={{fontSize:88,lineHeight:1,filter:`drop-shadow(0 0 16px ${b.tone})`}}>{b.icon}</div><strong style={{color:b.tone,letterSpacing:1}}>{b.title}</strong><h2 style={{margin:'8px 0'}}>{b.name}</h2></button>)}</div>
        <section style={{marginTop:18,padding:22,border:'1px solid #146c91',borderRadius:20,background:'rgba(2,19,44,.92)',boxShadow:'0 0 30px rgba(16,206,237,.08)'}}><div style={{color:'#22d9ee',fontWeight:900,letterSpacing:2,textAlign:'center'}}>SELECTED BOT</div><h2>{bot.name}</h2><p style={{opacity:.75}}>{bot.desc}</p><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{[['Market','Digits'],['Mode','Safe preview'],['Complexity','Controlled']].map(([a,b])=><div key={a} style={{padding:12,border:'1px solid #174b75',borderRadius:10}}><small style={{opacity:.6}}>{a}</small><div style={{fontWeight:900,marginTop:3}}>{b}</div></div>)}</div><button onClick={()=>setMessage(`${bot.name} preview loaded. No live trades were sent.`)} style={{marginTop:16,padding:'13px 22px',border:0,borderRadius:10,background:'#16b8e9',color:'#03142d',fontWeight:900}}>Load / Preview Bot</button>{message&&<div style={{marginTop:12,color:'#4de6b0',fontWeight:800}}>{message}</div>}</section>
        <section style={{marginTop:22}}><h2 style={{textAlign:'center',letterSpacing:2}}>EVERYTHING IN ONE WORKSPACE — FREE TO USE</h2><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>{[['🤖','Free Bot Library','Load proven strategies instantly.'],['🧠','Smart AI Recovery','Adaptive rules for changing conditions.'],['⌕','Market Analysis','Digit circles, tick analysis and signals.'],['◔','Speedbot','Fast rule execution for repeated setups.']].map(([icon,title,desc])=><div key={title} style={{padding:22,minHeight:120,border:'1px solid #174b75',borderRadius:18,background:'rgba(4,20,45,.78)'}}><div style={{fontSize:34}}>{icon}</div><h3 style={{margin:'8px 0'}}>{title}</h3><p style={{opacity:.65,margin:0}}>{desc}</p></div>)}</div></section>
    </div></main>;
};
export default FreeBots;
