import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icons'

const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const pad = n => String(n).padStart(2,'0')
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const parseISO = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
const sameDay = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
const stripTime = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export default function DatePicker({ value, onChange, min, label='Date', ariaLabel }){
 const [open,setOpen] = useState(false)
 const selected = value ? parseISO(value) : null
 const minDate = min ? parseISO(min) : null
 const today = new Date()
 const [view,setView] = useState(selected || today)
 const wrapRef = useRef(null)

 useEffect(()=>{
  if(!open) return
  setView(selected || today)
  const onDoc = e => { if(wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
  const onKey = e => { if(e.key==='Escape') setOpen(false) }
  document.addEventListener('mousedown', onDoc)
  document.addEventListener('keydown', onKey)
  return ()=>{ document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open])

 const startOfMonth = new Date(view.getFullYear(), view.getMonth(), 1)
 const startWeekday = startOfMonth.getDay()
 const daysInMonth = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate()
 const daysInPrevMonth = new Date(view.getFullYear(), view.getMonth(), 0).getDate()

 const cells = []
 for(let i=startWeekday-1;i>=0;i--) cells.push({ day:daysInPrevMonth-i, muted:true, date:new Date(view.getFullYear(), view.getMonth()-1, daysInPrevMonth-i) })
 for(let d=1; d<=daysInMonth; d++) cells.push({ day:d, muted:false, date:new Date(view.getFullYear(), view.getMonth(), d) })
 let n=1
 while(cells.length % 7 !== 0) cells.push({ day:n, muted:true, date:new Date(view.getFullYear(), view.getMonth()+1, n++) })

 const changeMonth = delta => setView(v => new Date(v.getFullYear(), v.getMonth()+delta, 1))
 const pick = date => {
  if(minDate && stripTime(date) < stripTime(minDate)) return
  onChange(toISO(date))
  setOpen(false)
 }
 const goToday = () => { setView(today); pick(today) }

 const display = selected ? selected.toLocaleDateString('en-GB',{ day:'2-digit', month:'short', year:'numeric' }) : 'Select date'

 return <div className="datepicker" ref={wrapRef}>
  <button type="button" className="datepicker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel||label} onClick={()=>setOpen(v=>!v)}>
   <Icon name="calendar" size={17}/>
   <span>{display}</span>
  </button>
  {open && <div className="datepicker-panel" role="dialog" aria-label={label}>
   <div className="dp-head">
    <button type="button" className="dp-nav" onClick={()=>changeMonth(-1)} aria-label="Previous month"><span className="dp-prev"><Icon name="chevron" size={16}/></span></button>
    <b>{MONTHS[view.getMonth()]} {view.getFullYear()}</b>
    <button type="button" className="dp-nav" onClick={()=>changeMonth(1)} aria-label="Next month"><Icon name="chevron" size={16}/></button>
   </div>
   <div className="dp-weekdays">{WEEKDAYS.map(w=><span key={w}>{w}</span>)}</div>
   <div className="dp-grid">
    {cells.map((c,i)=>{
     const disabled = minDate ? stripTime(c.date) < stripTime(minDate) : false
     const isToday = sameDay(c.date, today)
     const isSelected = selected && sameDay(c.date, selected)
     return <button type="button" key={i} disabled={disabled}
      className={`${c.muted?'dp-muted':''} ${isToday?'dp-today':''} ${isSelected?'dp-selected':''}`}
      onClick={()=>pick(c.date)}>{c.day}</button>
    })}
   </div>
   <div className="dp-foot">
    <button type="button" className="dp-text" onClick={()=>setOpen(false)}>Close</button>
    <button type="button" className="dp-text dp-today-btn" onClick={goToday}>Today</button>
   </div>
  </div>}
 </div>
}
