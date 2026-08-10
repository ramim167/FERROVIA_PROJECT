import { Icon } from './Icons'
import DatePicker from './DatePicker'

export default function SearchBox({ search, setSearch, onSubmit, compact=false, stations=[] }){
 const swap=()=>setSearch(s=>({...s,from:s.to,to:s.from}))
 const names=stations.length?stations.map(s=>s.station_name):[search.from,search.to].filter(Boolean)
 const now=new Date(), minDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
 return <form className={`search-box ${compact?'compact':''}`} onSubmit={e=>{e.preventDefault();onSubmit()}}>
   <label><span>Departure station</span><div className="field-wrap"><Icon name="mapPin" size={17}/><select aria-label="Departure station" value={search.from} onChange={e=>setSearch({...search,from:e.target.value})}>{names.map(x=><option key={x}>{x}</option>)}</select></div></label>
   <button type="button" className="swap" onClick={swap} title="Swap stations"><Icon name="swap" size={18}/></button>
   <label><span>Arrival station</span><div className="field-wrap destination"><Icon name="mapPin" size={17}/><select aria-label="Arrival station" value={search.to} onChange={e=>setSearch({...search,to:e.target.value})}>{names.map(x=><option key={x}>{x}</option>)}</select></div></label>
   <label><span>Journey date</span><DatePicker ariaLabel="Journey date" min={minDate} value={search.date} onChange={date=>setSearch({...search,date})}/></label>
   <label><span>Travellers</span><div className="field-wrap"><Icon name="users" size={17}/><select aria-label="Passengers" value={search.passengers} onChange={e=>setSearch({...search,passengers:+e.target.value})}>{[1,2,3,4].map(n=><option value={n} key={n}>{n} Passenger{n>1?'s':''}</option>)}</select></div></label>
   <button className="primary search-btn"><Icon name="search" size={18}/><span>Search trains</span><Icon name="arrow" size={18}/></button>
 </form>
}
