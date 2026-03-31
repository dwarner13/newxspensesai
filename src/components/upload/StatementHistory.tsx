import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';

const T = { bg:'#0b1220',surface:'#111a2e',border:'#1e2d4a',text:'#e8ecf4',muted:'#94a3b8',dim:'#64748b',green:'#34d399',red:'#f87171',cyan:'#22d3ee',amber:'#fbbf24' };

type StatementRow = { id:string; filename:string; status:string; txn_count:number; earliest:string|null; latest:string|null; uploaded_at:string };

function statusColor(s:string){if(s==='committed')return T.green;if(s==='normalizing'||s==='parsing'||s==='parsed')return T.amber;if(s==='failed'||s==='error')return T.red;return T.cyan;}
function statusLabel(s:string){if(s==='committed')return 'Committed';if(s==='normalizing')return 'Processing';if(s==='parsing')return 'Parsing';if(s==='parsed')return 'Parsed';if(s==='failed'||s==='error')return 'Failed';return s;}
function statusDot(s:string){if(s==='committed')return String.fromCharCode(10003);if(s==='failed'||s==='error')return String.fromCharCode(10005);return String.fromCharCode(9675);}
function formatDate(d:string|null){if(!d)return'--';return new Date(d).toLocaleDateString('en-CA',{month:'short',day:'numeric'});}

function SRow({row,i,isLast,onDelete}:{row:StatementRow;i:number;isLast:boolean;onDelete:(id:string)=>void}){
  const navigate=useNavigate();
  const isCommitted=row.status==='committed';
  const [confirmDelete,setConfirmDelete]=useState(false);
  return(
    <div onClick={()=>isCommitted&&navigate('/dashboard/transactions?importId='+row.id)}
      style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',padding:'11px 16px',
        borderBottom:isLast?'none':'1px solid '+T.border,
        background:i%2===0?T.bg:T.surface+'60',alignItems:'center',cursor:isCommitted?'pointer':'default'}}>
      <div style={{fontSize:13,color:isCommitted?T.text:T.muted,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>
        {row.filename}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontSize:12,fontWeight:800,color:statusColor(row.status)}}>{statusDot(row.status)}</span>
        <span style={{fontSize:11,fontWeight:700,color:statusColor(row.status)}}>{statusLabel(row.status)}</span>
      </div>
      <div style={{fontSize:12,color:row.txn_count>0?T.text:T.dim}}>{row.txn_count>0?row.txn_count+' txns':'--'}</div>
      <div style={{fontSize:11,color:T.muted}}>{row.earliest?formatDate(row.earliest)+' – '+formatDate(row.latest):'--'}</div>
      <div onClick={e=>e.stopPropagation()}>
        {confirmDelete?(
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>onDelete(row.id)} style={{fontSize:10,fontWeight:700,color:'#fff',background:T.red,border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Confirm</button>
            <button onClick={()=>setConfirmDelete(false)} style={{fontSize:10,fontWeight:700,color:T.muted,background:'transparent',border:'1px solid '+T.border,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Cancel</button>
          </div>
        ):(
          <button onClick={()=>setConfirmDelete(true)} style={{fontSize:10,fontWeight:700,color:T.red,background:'transparent',border:'1px solid '+T.red+'44',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Delete</button>
        )}
      </div>
    </div>
  );
}

export function StatementHistory(){
  const [rows,setRows]=useState<StatementRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [archiveOpen,setArchiveOpen]=useState(false);

  useEffect(()=>{
    async function load(){
      try{
        const sb=getSupabase();if(!sb)return;
        const{data:imports}=await sb.from('imports').select('id,file_url,status,created_at').order('created_at',{ascending:false}).limit(50);
        if(!imports||imports.length===0){setLoading(false);return;}
        const results:StatementRow[]=await Promise.all(imports.map(async(imp:any)=>{
          const filename=(imp.file_url||'').split('/').pop()||'Unknown';
          const{count,data:txData}=await sb.from('transactions').select('date',{count:'exact'}).eq('import_id',imp.id).order('date',{ascending:true});
          const dates=(txData||[]).map((t:any)=>t.date).filter(Boolean).sort();
          return{id:imp.id,filename:decodeURIComponent(filename),status:imp.status||'unknown',txn_count:count||0,earliest:dates[0]||null,latest:dates[dates.length-1]||null,uploaded_at:imp.created_at};
        }));
        setRows(results);
      }finally{setLoading(false);}
    }
    load();
  },[]);

  async function handleDelete(id:string){
    const sb=getSupabase();if(!sb)return;
    await sb.from('transactions').delete().eq('import_id',id);
    await sb.from('imports').delete().eq('id',id);
    await sb.from('transactions_staging').delete().eq('import_id',id);
    await sb.from('import_summaries').delete().eq('import_id',id);
    setRows(rows.filter(r=>r.id!==id));
  }

  if(loading)return <div style={{marginTop:32,padding:'16px 20px',borderRadius:14,background:T.surface,border:'1px solid '+T.border,color:T.dim,fontSize:12}}>Loading statement history...</div>;
  if(rows.length===0)return null;

  const active=rows.filter(r=>r.status!=='committed');
  const committed=rows.filter(r=>r.status==='committed');
  const recent=committed.slice(0,3);
  const archived=committed.slice(3);
  const visible=[...active,...recent];

  return(
    <div style={{marginTop:32}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.12em'}}>Statement History</div>
        <div style={{fontSize:11,color:T.dim}}>{committed.length} committed &middot; {active.length} active</div>
      </div>
      <div style={{borderRadius:14,border:'1px solid '+T.border,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',padding:'9px 16px',background:T.surface,borderBottom:'1px solid '+T.border}}>
          {['File','Status','Transactions','Date Range',''].map(h=>(
            <div key={h} style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em'}}>{h}</div>
          ))}
        </div>
        {visible.map((row,i)=><SRow key={row.id} row={row} i={i} isLast={i===visible.length-1&&archived.length===0} onDelete={handleDelete}/>)}
        {archived.length>0&&(
          <>
            <div onClick={()=>setArchiveOpen(v=>!v)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:T.surface+'cc',borderTop:'1px solid '+T.border,cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,color:T.dim,display:'inline-block',transform:archiveOpen?'rotate(90deg)':'none',transition:'transform 0.2s'}}>▶</span>
                <span style={{fontSize:12,fontWeight:600,color:T.muted}}>Archive</span>
                <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,background:T.border,color:T.dim,fontWeight:600}}>{archived.length}</span>
              </div>
              <span style={{fontSize:11,color:T.dim}}>{archiveOpen?'Collapse':'Show older statements'}</span>
            </div>
            {archiveOpen&&archived.map((row,i)=><SRow key={row.id} row={row} i={i} isLast={i===archived.length-1} onDelete={handleDelete}/>)}
          </>
        )}
      </div>
    </div>
  );
}