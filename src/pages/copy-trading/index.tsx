import React, { useState } from 'react';

const traders = [
    { id:'DT', name:'Digit Momentum', style:'Even / Odd scanner', return:'+18.4%', risk:'Medium', followers:'Demo profile' },
    { id:'JM', name:'Digits Flow', style:'Over / Under', return:'+14.2%', risk:'Medium', followers:'Demo profile' },
    { id:'GN', name:'Conservative Digits', style:'Matches / Differs', return:'+9.7%', risk:'Low', followers:'Demo profile' },
];

const CopyTrading = () => {
    const [selected,setSelected] = useState(0); const [allocation,setAllocation] = useState('10'); const [enabled,setEnabled] = useState(false); const [message,setMessage] = useState(''); const t=traders[selected];
    return <main style={{minHeight:'100%',background:'radial-gradient(circle at 50% 0,#10275b,#030b21 60%)',color:'#fff',padding:'24px 14px 100px'}}><div style={{maxWidth:1050,margin:'0 auto'}}>
        <header style={{textAlign:'center',marginBottom:20}}><small style={{color:'#2bdcf0',fontWeight:900,letterSpacing:2}}>COPY TRADER</small><h1 style={{fontSize:42,margin:'8px 0'}}>Copy Trading</h1><p style={{opacity:.7}}>Choose a strategy, control your allocation, and review the copy plan before activation.</p></header>
        <div style={{padding:14,border:'1px solid #e4c65d',borderRadius:12,background:'rgba(74,57,12,.55)',marginBottom:16}}><b>Demo / simulation workspace.</b> Real account copying requires authentication and explicit activation.</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>{traders.map((x,i)=><button key={x.name} onClick={()=>{setSelected(i);setMessage('')}} style={{textAlign:'left',padding:16,borderRadius:16,border:`2px solid ${i===selected?'#1bd8ee':'#174b75'}`,background:'rgba(4,18,43,.9)',color:'#fff'}}><div style={{display:'flex',gap:10,alignItems:'center'}}><span style={{width:46,height:46,borderRadius:'50%',display:'grid',placeItems:'center',background:'#082d55',border:'1px solid #1bd8ee',fontWeight:900}}>{x.id}</span><div><b>{x.name}</b><small style={{display:'block',opacity:.6}}>{x.style}</small></div></div><div style={{marginTop:14,color:'#3de3a5',fontSize:22,fontWeight:900}}>{x.return}</div><small style={{opacity:.6}}>{x.risk} risk • {x.followers}</small></button>)}</div>
        <section style={{marginTop:16,padding:20,border:'1px solid #17638b',borderRadius:18,background:'rgba(3,18,42,.94)'}}><h2>{t.name}</h2><p style={{opacity:.7}}>{t.style}</p><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}><label>Allocation %<input value={allocation} onChange={e=>setAllocation(e.target.value)} type='number' min='1' max='100' style={input}/></label><div style={metric}>Return<strong>{t.return}</strong></div><div style={metric}>Risk<strong>{t.risk}</strong></div></div><label style={{display:'flex',alignItems:'center',gap:10,marginTop:18}}><input type='checkbox' checked={enabled} onChange={e=>setEnabled(e.target.checked)} /> Enable copy plan after review</label><div style={{marginTop:18,padding:14,borderRadius:10,background:'#071a35'}}>Copy {t.name} with <b>{allocation}%</b> allocation. Status: <b>{enabled?'Ready after confirmation':'Review required'}</b>.</div><button onClick={()=>setMessage('Copy plan reviewed. No live trades or account changes were made.')} style={{marginTop:16,padding:'13px 22px',border:0,borderRadius:9,background:'#16b8e9',fontWeight:900}}>Review Copy Plan</button>{message&&<div style={{marginTop:10,color:'#43e6b0',fontWeight:800}}>{message}</div>}</section>
    </div></main>;
};
const input:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',padding:10,marginTop:5,borderRadius:8,border:'1px solid #27708e',background:'#07152b',color:'#fff'};
const metric:React.CSSProperties={padding:10,border:'1px solid #174b75',borderRadius:8,display:'flex',flexDirection:'column',gap:4};
export default CopyTrading;
