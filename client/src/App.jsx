import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SearchBox from './components/SearchBox'
import DatePicker from './components/DatePicker'
import { Icon } from './components/Icons'
import heroTrain from './assets/train-hero-updated.png'
import { api, clearSession, getStoredToken, storeSession } from './lib/api'

const pad=n=>String(n).padStart(2,'0')
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
const initialSearch={from:'Dhaka',to:'Chattogram',date:localToday(),passengers:1}
const money=n=>`৳${Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2})}`
const fmtTime=v=>v?new Date(v).toLocaleTimeString('en-BD',{hour:'2-digit',minute:'2-digit'}):'—'
const fmtDate=v=>v?new Date(v).toLocaleDateString('en-BD',{day:'2-digit',month:'short',year:'numeric'}):'—'
const durationText=(a,b)=>{if(!a||!b)return '—';const m=Math.max(0,Math.round((new Date(b)-new Date(a))/60000));return `${Math.floor(m/60)}h ${m%60}m`}
const delayText=n=>Number(n)>0?`${n} min late`:'On time'
const roleLabel=r=>r?String(r).charAt(0)+String(r).slice(1).toLowerCase():'Passenger'

function useReveal(deps=[]){
 useEffect(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const els=document.querySelectorAll('.reveal:not(.visible)')
  if(reduce){els.forEach(el=>el.classList.add('visible'));return}
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -40px 0px'})
  els.forEach(el=>io.observe(el));return()=>io.disconnect()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },deps)
}

function Counter({value,suffix=''}){
 const ref=useRef(null),[display,setDisplay]=useState('0')
 useEffect(()=>{
  const node=ref.current;if(!node)return
  const target=parseFloat(value),reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const run=()=>{if(reduce){setDisplay(value);return}const start=performance.now(),duration=900;const tick=now=>{const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,3);setDisplay(Math.round(target*e).toLocaleString());if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){run();io.disconnect()}}),{threshold:.4});io.observe(node);return()=>io.disconnect()
 },[value])
 return <strong ref={ref}>{display}{suffix}</strong>
}

function Steps({step}){return <div className="steps">{['Train','Seats','Passengers','Payment','Ticket'].map((x,i)=><div className={i<=step?'done':''} key={x}><span className={i===step?'flip':''}>{i<step?<Icon name="check" size={15}/>:i+1}</span><b>{x}</b></div>)}</div>}

function App(){
 const [page,setPage]=useState('home')
 const [search,setSearch]=useState(initialSearch)
 const [stations,setStations]=useState([])
 const [searchResults,setSearchResults]=useState([])
 const [selectedTrain,setSelectedTrain]=useState(null)
 const [selectedClass,setSelectedClass]=useState(null)
 const [seatList,setSeatList]=useState([])
 const [seats,setSeats]=useState([])
 const [passengers,setPassengers]=useState([])
 const [pendingBooking,setPendingBooking]=useState(null)
 const [lastBooking,setLastBooking]=useState(null)
 const [bookings,setBookings]=useState([])
 const [notifications,setNotifications]=useState([])
 const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('rail-user')||'null'))
 const [authOpen,setAuthOpen]=useState(false)
 const [authMode,setAuthMode]=useState('signin')
 const [authResume,setAuthResume]=useState(null)
 const [toast,setToast]=useState('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [favorites,setFavorites]=useState(()=>JSON.parse(localStorage.getItem('rail-favorites')||'[]'))
 const [detailTrain,setDetailTrain]=useState(null)

 useEffect(()=>localStorage.setItem('rail-favorites',JSON.stringify(favorites)),[favorites])
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t)}},[toast])
 useEffect(()=>{if(error){const t=setTimeout(()=>setError(''),4500);return()=>clearTimeout(t)}},[error])
 useReveal([page,loading,searchResults.length])

 const handleError=useCallback(err=>{console.error(err);setError(err.message||'Something went wrong')},[])
 const navigate=p=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'})}

 const loadStations=useCallback(async()=>{try{setStations(await api('/stations'))}catch(err){handleError(err)}},[handleError])
 const loadBookings=useCallback(async()=>{
  if(!getStoredToken())return setBookings([])
  try{setBookings(await api('/bookings/mine'))}catch(err){if(err.status===401){clearSession();setUser(null);setBookings([])}else handleError(err)}
 },[handleError])
 const loadNotifications=useCallback(async()=>{
  if(!getStoredToken())return setNotifications([])
  try{setNotifications(await api('/notifications'))}catch(err){if(err.status!==401)handleError(err)}
 },[handleError])

 useEffect(()=>{loadStations()},[loadStations])
 useEffect(()=>{
  const token=getStoredToken();if(!token)return
  api('/auth/me').then(me=>{setUser(me);localStorage.setItem('rail-user',JSON.stringify(me));loadBookings();loadNotifications()}).catch(()=>{clearSession();setUser(null)})
 },[loadBookings,loadNotifications])
 useEffect(()=>{if(user){loadBookings();loadNotifications()}else{setBookings([]);setNotifications([])}},[user,loadBookings,loadNotifications])

 const doSearch=async()=>{
  if(search.from===search.to){setToast('Departure and arrival stations must be different');return}
  setLoading(true);setError('');navigate('search')
  try{
   const trips=await api(`/trains/search?from=${encodeURIComponent(search.from)}&to=${encodeURIComponent(search.to)}&date=${encodeURIComponent(search.date)}`)
   const enriched=await Promise.all(trips.map(async t=>{
    let classes=[]
    try{classes=await api(`/bookings/classes?tripId=${t.trip_id}&sourceStationId=${t.source_station_id}&destinationStationId=${t.destination_station_id}`)}catch{classes=[]}
    return {...t,classes}
   }))
   setSearchResults(enriched)
  }catch(err){setSearchResults([]);handleError(err)}finally{setLoading(false)}
 }

 const chooseTrain=async(t,c)=>{
  setLoading(true);setSelectedTrain(t);setSelectedClass(c);setSeats([])
  try{
   const data=await api(`/bookings/seats?tripId=${t.trip_id}&sourceStationId=${t.source_station_id}&destinationStationId=${t.destination_station_id}&classId=${c.classId}`)
   setSeatList(data.seats||[]);navigate('seats')
  }catch(err){handleError(err)}finally{setLoading(false)}
 }
 const toggleSeat=id=>setSeats(s=>s.includes(id)?s.filter(x=>x!==id):s.length<search.passengers?[...s,id]:(setToast(`You can select only ${search.passengers} seat(s)`),s))
 const continuePassengers=()=>{if(seats.length!==search.passengers){setToast(`Select ${search.passengers} seat(s) first`);return}setPassengers(Array.from({length:search.passengers},(_,i)=>passengers[i]||{name:'',age:'',gender:'MALE'}));navigate('passengers')}
 const updatePassenger=(i,key,val)=>setPassengers(p=>p.map((x,j)=>j===i?{...x,[key]:val}:x))
 const selectedSeatLabels=seats.map(id=>{const s=seatList.find(x=>Number(x.trip_seat_id)===Number(id));return s?`${s.coach_code}-${s.seat_number}`:`#${id}`})
 const estimatedTotal=(selectedClass?.farePerPassenger||0)*search.passengers

 const createPendingBooking=async(tokenOverride)=>{
  setLoading(true)
  try{
   const data=await api('/bookings',{method:'POST',token:tokenOverride||getStoredToken(),body:{
    tripId:selectedTrain.trip_id,sourceStationId:selectedTrain.source_station_id,destinationStationId:selectedTrain.destination_station_id,classId:selectedClass.classId,
    passengers:passengers.map((p,i)=>({...p,age:Number(p.age),tripSeatId:Number(seats[i])}))
   }})
   setPendingBooking(data);navigate('payment')
  }catch(err){handleError(err)}finally{setLoading(false)}
 }
 const toPayment=async()=>{
  if(passengers.some(p=>!p.name||!p.age||Number(p.age)<1||Number(p.age)>120)){setToast('Complete passenger information with age 1–120');return}
  if(!user){setAuthResume('payment');setAuthMode('signin');setAuthOpen(true);setToast('Sign in to hold your selected seats');return}
  await createPendingBooking()
 }
 const confirmPayment=async(e,method)=>{
  e.preventDefault();if(!pendingBooking)return
  setLoading(true)
  try{
   const map={'Mobile Banking':'MOBILE_BANKING','Card':'CARD','Bank Transfer':'BANK_TRANSFER'}
   const form=new FormData(e.currentTarget)
   const data=await api(`/bookings/${pendingBooking.pnr_number}/pay`,{method:'POST',body:{method:map[method],transactionId:form.get('transactionId')||undefined}})
   setLastBooking(data);setPendingBooking(null);await Promise.all([loadBookings(),loadNotifications()]);navigate('confirmation')
  }catch(err){handleError(err)}finally{setLoading(false)}
 }
 const cancelBooking=async pnr=>{
  if(!confirm(`Cancel booking ${pnr}?`))return
  setLoading(true);try{const result=await api(`/bookings/${pnr}/cancel`,{method:'POST'});setToast(result.refundRequested?'Cancelled. Refund request created.':'Booking cancelled.');await Promise.all([loadBookings(),loadNotifications()])}catch(err){handleError(err)}finally{setLoading(false)}
 }
 const logout=()=>{clearSession();setUser(null);setToast('Signed out successfully');navigate('home')}
 const toggleFavorite=id=>setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id])
 const unreadCount=notifications.filter(n=>Number(n.is_read)===0).length

 const authSuccess=async session=>{
  storeSession(session);setUser(session.user);setAuthOpen(false);setToast(`Welcome, ${session.user.full_name}`)
  const resume=authResume;setAuthResume(null)
  if(resume==='payment')await createPendingBooking(session.token)
 }

 return <div id="root" className="app"><div className="ambient ambient-one"></div><div className="ambient ambient-two"></div>
  <Navbar page={page} navigate={navigate} user={user} onAuth={()=>setAuthOpen(true)} onLogout={logout} notificationCount={unreadCount}/>
  {toast&&<div className="toast"><Icon name="check" size={16}/>{toast}</div>}
  {error&&<div className="toast error-toast"><Icon name="info" size={16}/>{error}</div>}
  {loading&&<div className="global-loading"><span></span></div>}
  <div key={page} className="page-transition">
   {page==='home'&&<Home search={search} setSearch={setSearch} doSearch={doSearch} navigate={navigate} stations={stations}/>} 
   {page==='search'&&<SearchPage search={search} setSearch={setSearch} doSearch={doSearch} chooseTrain={chooseTrain} favorites={favorites} toggleFavorite={toggleFavorite} setDetailTrain={setDetailTrain} loading={loading} trains={searchResults} stations={stations}/>} 
   {page==='seats'&&<SeatPage train={selectedTrain} cls={selectedClass} search={search} seatList={seatList} seats={seats} seatLabels={selectedSeatLabels} toggleSeat={toggleSeat} next={continuePassengers} back={()=>navigate('search')} total={estimatedTotal}/>} 
   {page==='passengers'&&<PassengerPage passengers={passengers} update={updatePassenger} next={toPayment} back={()=>navigate('seats')} train={selectedTrain} cls={selectedClass} search={search} seatLabels={selectedSeatLabels} total={estimatedTotal}/>} 
   {page==='payment'&&<PaymentPage booking={pendingBooking} confirm={confirmPayment} back={()=>navigate('passengers')} train={selectedTrain} cls={selectedClass} search={search} seatLabels={selectedSeatLabels}/>} 
   {page==='confirmation'&&<Confirmation booking={lastBooking} navigate={navigate}/>} 
   {page==='dashboard'&&<Dashboard user={user} bookings={bookings} favorites={favorites} notifications={notifications} navigate={navigate} onAuth={()=>setAuthOpen(true)}/>} 
   {page==='tickets'&&<Tickets user={user} bookings={bookings} navigate={navigate} cancel={cancelBooking} onAuth={()=>setAuthOpen(true)} handleError={handleError}/>} 
   {page==='track'&&<TrackTrain handleError={handleError}/>} 
   {page==='notifications'&&<NotificationsPage user={user} notifications={notifications} reload={loadNotifications} onAuth={()=>setAuthOpen(true)} handleError={handleError}/>} 
   {page==='operator'&&<OperatorPanel user={user} handleError={handleError} setToast={setToast}/>} 
   {page==='admin'&&<AdminPanel user={user} handleError={handleError} setToast={setToast}/>} 
   {page==='support'&&<Support setToast={setToast}/>} 
  </div>
  <Footer navigate={navigate}/>
  {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} close={()=>{setAuthOpen(false);setAuthResume(null)}} onSuccess={authSuccess}/>} 
  {detailTrain&&<TrainDetail train={detailTrain} close={()=>setDetailTrain(null)} choose={c=>{chooseTrain(detailTrain,c);setDetailTrain(null)}}/>}
 </div>
}

function Home({search,setSearch,doSearch,navigate,stations}){return <><section className="hero home-hero-clean"><div className="hero-copy"><span className="eyebrow">BANGLADESH RAILWAY E-TICKETING</span><h1>Travel smarter.<br/><em>Arrive inspired.</em></h1><p>Search, reserve and track your railway journey through a secure Oracle-backed travel workspace.</p><div className="hero-actions"><button className="primary" onClick={doSearch}>Book your journey <Icon name="arrow" size={18}/></button><button className="ghost-button" onClick={()=>navigate('track')}><Icon name="train" size={18}/> Track a train</button></div><div className="hero-badges"><span><Icon name="shield" size={16}/> Secure account booking</span><span><Icon name="ticket" size={16}/> Database-backed e-ticket</span><span><Icon name="clock" size={16}/> Live delay status</span></div></div><div className="train-art hero-visual-card"><div className="hero-orbit"></div><img className="hero-train-image" src={heroTrain} alt="Modern intercity train illustration"/></div></section><div className="search-wrap reveal"><SearchBox search={search} setSearch={setSearch} onSubmit={doSearch} stations={stations}/></div><section className="feature-strip reveal"><article><Icon name="train" size={24}/><div><Counter value="1"/><span>service demo with rotating physical trainsets</span></div></article><article><Icon name="clock" size={24}/><div><Counter value="60" suffix=" min"/><span>delay threshold for spare rotation</span></div></article><article><Icon name="shield" size={24}/><div><Counter value="10" suffix=" min"/><span>database seat-hold window</span></div></article></section></>}

function SkeletonCard(){return <div className="train-card card skeleton-card"><div className="sk-row sk-w40"></div><div className="sk-row sk-w70" style={{height:34,marginTop:18}}></div><div className="sk-row sk-w100" style={{height:44,marginTop:18}}></div></div>}

function SearchPage({search,setSearch,doSearch,chooseTrain,favorites,toggleFavorite,setDetailTrain,loading,trains,stations}){
 const [times,setTimes]=useState([]),[types,setTypes]=useState([]),[sort,setSort]=useState('earliest')
 const filtered=useMemo(()=>{
  let list=[...trains]
  if(times.length)list=list.filter(t=>{const h=new Date(t.scheduled_departure).getHours();return times.some(x=>x==='Morning'?(h>=5&&h<12):x==='Afternoon'?(h>=12&&h<17):x==='Evening'?(h>=17&&h<22):(h>=22||h<5))})
  if(types.length)list=list.filter(t=>types.includes(String(t.train_type||'').toUpperCase()))
  return list.sort((a,b)=>sort==='lowest'?Math.min(...(a.classes||[]).map(c=>Number(c.farePerPassenger||999999)))-Math.min(...(b.classes||[]).map(c=>Number(c.farePerPassenger||999999))):new Date(a.scheduled_departure)-new Date(b.scheduled_departure))
 },[trains,times,types,sort])
 const toggle=(setter,value)=>setter(a=>a.includes(value)?a.filter(x=>x!==value):[...a,value])
 return <main className="page"><div className="page-title"><span className="eyebrow">LIVE ORACLE SCHEDULE SEARCH</span><h1>Choose the best journey</h1><p>{search.from} to {search.to} • {search.date}</p></div><SearchBox compact search={search} setSearch={setSearch} onSubmit={doSearch} stations={stations}/><div className="results-layout"><aside className="filters card"><div className="filter-title"><h3><Icon name="filter" size={18}/> Filters</h3><button onClick={()=>{setTimes([]);setTypes([])}}>Reset</button></div><label>Departure time</label>{['Morning','Afternoon','Evening','Night'].map(x=><label className="check" key={x}><input type="checkbox" checked={times.includes(x)} onChange={()=>toggle(setTimes,x)}/><span></span>{x}</label>)}<label>Train type</label>{['INTERCITY','EXPRESS','MAIL'].map(x=><label className="check" key={x}><input type="checkbox" checked={types.includes(x)} onChange={()=>toggle(setTypes,x)}/><span></span>{x}</label>)}</aside><section className="train-results"><div className="result-top"><div><b>{filtered.length} trains available</b><small>Results are read from Oracle TRIPS + ROUTES</small></div><select value={sort} onChange={e=>setSort(e.target.value)}><option value="earliest">Earliest departure</option><option value="lowest">Lowest fare</option></select></div>{loading?<>{[0,1].map(i=><SkeletonCard key={i}/>)}</>:!filtered.length?<div className="empty card reveal visible"><Icon name="search" size={34}/><h2>No scheduled trip found</h2><p>Try a different route/date, or create the dated trip from the Admin panel.</p></div>:filtered.map((t,i)=><article className="train-card card reveal" style={{transitionDelay:`${Math.min(i,6)*60}ms`}} key={t.trip_id}><div className="train-head"><div><span className="train-badge"><Icon name="train" size={23}/></span><h3>{t.train_name}<small>{t.train_code} • {t.train_type} • {t.direction}</small></h3></div><div className="train-tools"><button className={favorites.includes(t.train_id)?'favorite active':'favorite'} onClick={()=>toggleFavorite(t.train_id)} title="Save train"><Icon name="heart" size={19}/></button><span className={`live-pill ${Number(t.current_delay_minutes)>0?'late':'ontime'}`}>{delayText(t.current_delay_minutes)}</span></div></div><div className="timeline"><div><b>{fmtTime(t.scheduled_departure)}</b><span>{t.source_station}</span></div><div className="duration"><span><Icon name="clock" size={14}/>{durationText(t.scheduled_departure,t.scheduled_arrival)}</span><i></i><small>{t.trip_status}</small></div><div><b>{fmtTime(t.scheduled_arrival)}</b><span>{t.destination_station}</span></div></div>{t.last_left_station&&<div className="inline-live"><Icon name="info" size={15}/> Last left {t.last_left_station} at {fmtTime(t.last_left_at)} • {delayText(t.current_delay_minutes)}</div>}<button className="details-link" onClick={()=>setDetailTrain(t)}><Icon name="info" size={16}/> View trip details</button><div className="classes">{(t.classes||[]).length?(t.classes||[]).map(c=><button key={c.classId} disabled={!c.availableSeats} onClick={()=>chooseTrain(t,c)}><span><b>{c.className}</b><small>{c.availableSeats} seats available</small></span><strong>{money(c.farePerPassenger)}</strong><em>Select <Icon name="chevron" size={15}/></em></button>):<div className="class-empty">No fare/seat inventory configured for this trip.</div>}</div></article>)}</section></div></main>
}

function Summary({train,cls,search,seatLabels,total}){return <aside className="summary card"><h3>Booking summary</h3><div className="summary-train"><span><Icon name="train" size={23}/></span><div><b>{train?.train_name}</b><small>{train?.train_code} • {cls?.className}</small></div></div><dl><dt>Journey</dt><dd>{search.from} → {search.to}</dd><dt>Date</dt><dd>{search.date}</dd><dt>Time</dt><dd>{fmtTime(train?.scheduled_departure)} – {fmtTime(train?.scheduled_arrival)}</dd><dt>Seats</dt><dd>{seatLabels?.length?seatLabels.join(', '):'Not selected'}</dd></dl><div className="total"><span>Total fare</span><b>{money(total)}</b></div><div className="summary-safe"><Icon name="shield" size={16}/> Fare is calculated by the backend</div></aside>}

function SeatPage({train,cls,search,seatList,seats,seatLabels,toggleSeat,next,back,total}){
 const grouped=useMemo(()=>Object.entries(seatList.reduce((m,s)=>{(m[s.coach_code]??=[]).push(s);return m},{})),[seatList])
 return <main className="page"><Steps step={1}/><div className="page-title"><span className="eyebrow">SEGMENT-AWARE SEAT SELECTION</span><h1>{train?.train_name}</h1><p>{cls?.className} • Choose {search.passengers} seat(s)</p></div><div className="booking-layout"><section className="seat-panel card"><div className="coach-header"><div><b>{cls?.className}</b><span>Only non-overlapping seats for {search.from} → {search.to} are selectable</span></div><div className="legend"><span><i className="available"></i>Available</span><span><i className="selected"></i>Selected</span><span><i className="blocked"></i>Booked/Held</span></div></div>{!grouped.length?<div className="empty"><p>No seat inventory found.</p></div>:grouped.map(([coach,list])=><div className="coach-block" key={coach}><h4>Coach {coach}</h4><div className="coach"><div className="driver"><Icon name="train" size={26}/></div><div className="seat-grid">{list.map((s,i)=>{const id=Number(s.trip_seat_id),blocked=Number(s.is_available)!==1;return <button aria-label={`Seat ${coach}-${s.seat_number}`} key={id} disabled={blocked} className={blocked?'blocked':seats.includes(id)?'selected':''} onClick={()=>toggleSeat(id)}>{s.seat_number}{i%4===1&&<span className="aisle"></span>}</button>})}</div></div></div>)}<div className="actions"><button className="secondary" onClick={back}>← Back</button><button className="primary" onClick={next}>Continue to passengers <Icon name="arrow" size={17}/></button></div></section><Summary train={train} cls={cls} search={search} seatLabels={seatLabels} total={total}/></div></main>
}

function PassengerPage({passengers,update,next,back,train,cls,search,seatLabels,total}){return <main className="page"><Steps step={2}/><div className="page-title"><span className="eyebrow">PASSENGER DETAILS</span><h1>Who is travelling?</h1><p>Each passenger is tied to one selected database seat.</p></div><div className="booking-layout"><section className="passenger-panel card">{passengers.map((p,i)=><div className="passenger-form" key={i}><div className="passenger-number">{i+1}</div><h3>Passenger {i+1} • {seatLabels[i]}</h3><label>Full name<input value={p.name} onChange={e=>update(i,'name',e.target.value)} placeholder="Passenger full name"/></label><label>Age<input type="number" min="1" max="120" value={p.age} onChange={e=>update(i,'age',e.target.value)} placeholder="Age"/></label><label>Gender<select value={p.gender} onChange={e=>update(i,'gender',e.target.value)}><option>MALE</option><option>FEMALE</option><option>OTHER</option></select></label></div>)}<div className="actions"><button className="secondary" onClick={back}>← Back</button><button className="primary" onClick={next}>Hold seats & continue <Icon name="arrow" size={17}/></button></div></section><Summary train={train} cls={cls} search={search} seatLabels={seatLabels} total={total}/></div></main>}

function PaymentPage({booking,confirm,back,train,cls,search,seatLabels}){
 const [method,setMethod]=useState('Mobile Banking');const total=Number(booking?.total_fare||0)
 if(!booking)return <main className="page empty"><h2>No active seat hold</h2><p>Return to seat selection and create a booking hold.</p></main>
 const expiry=booking.passengers?.find(p=>p.hold_expires_at)?.hold_expires_at
 return <main className="page"><Steps step={3}/><div className="page-title"><span className="eyebrow">SECURE DEMO CHECKOUT</span><h1>Choose payment method</h1><p>Your Oracle seat reservation is HELD for {booking.holdMinutes||10} minutes{expiry?` (until ${fmtTime(expiry)})`:''}.</p></div><div className="booking-layout"><form className="payment card" onSubmit={e=>confirm(e,method)}><h3>Payment method</h3><div className="pay-options">{['Mobile Banking','Card','Bank Transfer'].map((x,i)=><label className={method===x?'selected':''} key={x}><input type="radio" name="pay" checked={method===x} onChange={()=>setMethod(x)}/><span>{i===0?'📱':i===1?'💳':'🏦'}</span>{x}<Icon name="check" size={16}/></label>)}</div>{method==='Mobile Banking'&&<><label>Mobile number<input required placeholder="01XXXXXXXXX" pattern="01[0-9]{9}"/></label><label>Transaction reference<input name="transactionId" required placeholder="Demo transaction ID"/></label></>}{method==='Card'&&<><label>Card number<input required inputMode="numeric" placeholder="1234 5678 9012 3456"/></label><div className="form-row"><label>Expiry<input required placeholder="MM/YY"/></label><label>CVV<input required placeholder="123" maxLength="4"/></label></div></>}{method==='Bank Transfer'&&<label>Bank reference<input name="transactionId" required placeholder="Transfer reference number"/></label>}<div className="secure-note"><Icon name="shield" size={18}/> Academic demo: backend records a successful payment; no real money is charged.</div><div className="fare-lines"><span>Backend ticket fare <b>{money(total)}</b></span><span>Service fee <b>{money(0)}</b></span><span>Total <b>{money(total)}</b></span></div><div className="actions"><button type="button" className="secondary" onClick={back}>← Back</button><button className="primary">Pay {money(total)} & confirm</button></div></form><Summary train={train} cls={cls} search={search} seatLabels={seatLabels} total={total}/></div></main>
}

function Confirmation({booking,navigate}){
 if(!booking)return <main className="page empty"><h2>No recent confirmed booking</h2></main>
 const seats=(booking.passengers||[]).map(p=>`${p.coach_code}-${p.seat_number}`)
 const download=()=>{const text=`FERROVIA E-Ticket\nPNR: ${booking.pnr_number}\nTrain: ${booking.train_name}\nRoute: ${booking.source_station} to ${booking.destination_station}\nDeparture: ${fmtDate(booking.scheduled_departure)} ${fmtTime(booking.scheduled_departure)}\nSeat: ${seats.join(', ')}\nFare: ${money(booking.total_fare)}`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download=`ticket-${booking.pnr_number}.txt`;a.click();URL.revokeObjectURL(a.href)}
 return <main className="page"><Steps step={4}/><section className="success card"><div className="success-icon"><Icon name="check" size={30}/></div><span className="eyebrow">DATABASE BOOKING CONFIRMED</span><h1>Your ticket is ready!</h1><p>Payment, booking, reservations and ticket rows have been committed in Oracle.</p><div className="ticket"><div className="ticket-main"><div className="ticket-brand"><span className="brand-mark"><Icon name="train" size={19}/></span><b>FERROVIA Ticket</b><strong>{booking.pnr_number}</strong></div><h2>{booking.train_name}</h2><div className="ticket-route"><div><b>{fmtTime(booking.scheduled_departure)}</b><span>{booking.source_station}</span></div><div className="route-line"><i></i><Icon name="train" size={20}/><i></i></div><div><b>{fmtTime(booking.scheduled_arrival)}</b><span>{booking.destination_station}</span></div></div><div className="ticket-info"><span>Date<b>{fmtDate(booking.scheduled_departure)}</b></span><span>Class<b>{booking.class_name}</b></span><span>Seat<b>{seats.join(', ')}</b></span><span>Fare<b>{money(booking.total_fare)}</b></span></div></div><div className="qr">▦<small>PNR verified</small></div></div><div className="actions center"><button className="secondary" onClick={()=>window.print()}><Icon name="print" size={17}/> Print</button><button className="secondary" onClick={download}><Icon name="download" size={17}/> Download</button><button className="primary" onClick={()=>navigate('tickets')}>View my tickets</button></div></section></main>
}

function Dashboard({user,bookings,favorites,notifications,navigate,onAuth}){
 if(!user)return <AccessCard title="Sign in for your travel dashboard" copy="Bookings, tickets, cancellations and notifications are stored in Oracle under your account." action="Sign in" onAction={onAuth}/>
 const confirmed=bookings.filter(b=>b.booking_status==='CONFIRMED'),spent=confirmed.reduce((sum,b)=>sum+Number(b.total_fare||0),0)
 const upcoming=[...confirmed].filter(b=>new Date(b.scheduled_departure)>=new Date()).sort((a,b)=>new Date(a.scheduled_departure)-new Date(b.scheduled_departure))[0]
 const unread=notifications.filter(n=>Number(n.is_read)===0).length
 return <main className="page dashboard-page"><section className="dashboard-hero"><div><span className="eyebrow">{roleLabel(user.role).toUpperCase()} COMMAND CENTER</span><h1>Welcome back, {user.full_name?.split(' ')[0]}</h1><p>Your database-backed bookings, live railway tools and account activity in one workspace.</p><div className="hero-actions"><button className="primary" onClick={()=>navigate('search')}>Plan a new journey <Icon name="arrow" size={18}/></button><button className="secondary" onClick={()=>navigate('track')}>Track a train</button></div></div><div className="dashboard-orb"><Icon name="train" size={62}/><span>{user.role}</span></div></section><section className="metric-grid"><article><span><Icon name="ticket" size={19}/></span><div><small>Confirmed journeys</small><strong>{confirmed.length}</strong></div></article><article><span><Icon name="heart" size={19}/></span><div><small>Saved trains</small><strong>{favorites.length}</strong></div></article><article><span><Icon name="shield" size={19}/></span><div><small>Booked value</small><strong>{money(spent)}</strong></div></article><article><span><Icon name="bell" size={19}/></span><div><small>Unread alerts</small><strong>{unread}</strong></div></article></section><section className="dashboard-grid"><article className="card journey-focus"><div className="section-head"><div><span className="eyebrow">NEXT JOURNEY</span><h2>{upcoming?'Ready for departure':'Nothing scheduled yet'}</h2></div>{upcoming&&<span className="confirmed">CONFIRMED</span>}</div>{upcoming?<><div className="journey-route"><div><b>{fmtTime(upcoming.scheduled_departure)}</b><span>{upcoming.source_station}</span></div><div className="journey-line"><i></i><Icon name="train" size={22}/><i></i></div><div><b>{fmtTime(upcoming.scheduled_arrival)}</b><span>{upcoming.destination_station}</span></div></div><div className="journey-meta"><span>Date<b>{fmtDate(upcoming.scheduled_departure)}</b></span><span>Train<b>{upcoming.train_name}</b></span><span>Direction<b>{upcoming.direction}</b></span><span>PNR<b>{upcoming.pnr_number}</b></span></div><button className="text-btn" onClick={()=>navigate('tickets')}>View ticket wallet <Icon name="arrow" size={16}/></button></>:<div className="empty-dashboard"><Icon name="ticket" size={38}/><p>Create your next booking and it will appear here.</p><button className="primary" onClick={()=>navigate('search')}>Find trains</button></div>}</article><aside className="card quick-panel"><span className="eyebrow">QUICK ACTIONS</span><h2>Railway toolkit</h2>{[['train','Track live train','Last station and current delay','track'],['ticket','Ticket wallet','Manage bookings and refunds','tickets'],['bell','Notifications','Booking and cancellation alerts','notifications'],...(user.role==='OPERATOR'||user.role==='ADMIN'?[['clock','Operator console','Mark arrival/departure','operator']]:[]),...(user.role==='ADMIN'?[['chart','Admin operations','Trips, trainsets and assignments','admin']]:[])].map(([icon,title,copy,target])=><button key={title} onClick={()=>navigate(target)}><span><Icon name={icon} size={19}/></span><div><b>{title}</b><small>{copy}</small></div><Icon name="arrow" size={16}/></button>)}</aside></section></main>
}

function Tickets({user,bookings,navigate,cancel,onAuth,handleError}){
 const [selected,setSelected]=useState(null),[detailLoading,setDetailLoading]=useState(false)
 if(!user)return <AccessCard title="Sign in to view My Tickets" copy="Your ticket wallet is loaded from Oracle, not browser localStorage." action="Sign in" onAction={onAuth}/>
 const open=async pnr=>{setDetailLoading(true);try{setSelected(await api(`/bookings/${pnr}`))}catch(err){handleError(err)}finally{setDetailLoading(false)}}
 return <main className="page"><div className="page-title"><span className="eyebrow">MY ORACLE BOOKINGS</span><h1>Tickets & bookings</h1><p>View passenger seats, cancellation status and refund requests.</p></div>{detailLoading&&<div className="mini-loading">Loading ticket…</div>}{!bookings.length?<div className="empty card"><Icon name="ticket" size={42}/><h2>No tickets yet</h2><p>Your confirmed and pending bookings will appear here.</p><button className="primary" onClick={()=>navigate('search')}>Book a ticket</button></div>:<div className="ticket-list">{bookings.map(b=><article className="booking-card card" key={b.pnr_number}><div className="booking-status"><span className={String(b.booking_status).toLowerCase()}>{b.booking_status}</span><small>PNR {b.pnr_number}</small></div><div className="booking-main"><div><h3>{b.train_name}</h3><p>{b.source_station} → {b.destination_station}</p></div><div><b>{fmtDate(b.scheduled_departure)}</b><span>{fmtTime(b.scheduled_departure)} – {fmtTime(b.scheduled_arrival)}</span></div><div><b>{b.direction}</b><span>Database booking</span></div><div><b>{money(b.total_fare)}</b><span>{fmtDate(b.booking_time)}</span></div></div><div className="booking-actions"><button onClick={()=>open(b.pnr_number)}><Icon name="eye" size={16}/> View</button><button onClick={()=>window.print()}><Icon name="print" size={16}/> Print</button>{['CONFIRMED','PENDING'].includes(b.booking_status)&&<button className="danger-text" onClick={()=>cancel(b.pnr_number)}>Cancel</button>}</div></article>)}</div>}{selected&&<BookingModal booking={selected} close={()=>setSelected(null)}/>}</main>
}

function TrackTrain({handleError}){
 const [query,setQuery]=useState('SUBORNO'),[live,setLive]=useState(null),[stops,setStops]=useState([]),[loading,setLoading]=useState(false)
 const track=async e=>{e?.preventDefault();if(!query.trim())return;setLoading(true);try{const q=query.trim();const data=/^\d+$/.test(q)?await api(`/trips/${q}/status`):await api(`/trains/${encodeURIComponent(q)}/status`);setLive(data);setStops(await api(`/trips/${data.trip_id}/stops`))}catch(err){setLive(null);setStops([]);handleError(err)}finally{setLoading(false)}}
 const atStop=stops.find(s=>s.actual_arrival&&!s.actual_departure)
 return <main className="page"><div className="page-title"><span className="eyebrow">NO GPS REQUIRED</span><h1>Track train operation</h1><p>Enter a train code such as SUBORNO or a numeric Trip ID.</p></div><form className="track-search card" onSubmit={track}><div className="field-wrap"><Icon name="train" size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SUBORNO or Trip ID"/></div><button className="primary"><Icon name="search" size={18}/> Track train</button></form>{loading?<SkeletonCard/>:live&&<><section className="live-status-card card"><div className="live-status-head"><div><span className="train-badge"><Icon name="train" size={26}/></span><div><span className="eyebrow">TRIP #{live.trip_id} • {live.direction}</span><h2>{live.train_name}</h2><p>{live.train_code} • {live.trip_status}</p></div></div><span className={`delay-badge ${Number(live.current_delay_minutes)>0?'late':'ontime'}`}>{delayText(live.current_delay_minutes)}</span></div><div className="live-facts"><article><small>Current operational position</small><b>{atStop?`At ${atStop.station_name}`:live.last_left_station?`Left ${live.last_left_station}`:live.trip_status==='COMPLETED'?'Journey completed':'Not departed yet'}</b><span>{atStop?`Arrived ${fmtTime(atStop.actual_arrival)}`:live.last_left_at?`Departed ${fmtTime(live.last_left_at)}`:'Waiting for operator update'}</span></article><article><small>Next station</small><b>{atStop?'Waiting to depart':live.next_station||'—'}</b><span>Scheduled {fmtTime(live.next_scheduled_arrival||live.next_scheduled_departure)}</span></article><article><small>Original schedule</small><b>{fmtTime(live.scheduled_departure)} → {fmtTime(live.scheduled_arrival)}</b><span>Timetable stays unchanged when delayed</span></article><article><small>Spare rotation</small><b>{Number(live.spare_triggered)?'Triggered':'Not triggered'}</b><span>Threshold: 60 minutes in demo data</span></article></div></section><StopTimeline stops={stops}/></>}</main>
}

function StopTimeline({stops}){return <section className="card stop-timeline"><div className="section-head"><div><span className="eyebrow">OPERATOR EVENT LOG</span><h2>Station progression</h2></div></div>{stops.map((s,i)=><div className={`stop-row ${String(s.stop_status).toLowerCase()}`} key={s.trip_stop_id}><div className="stop-dot">{s.actual_departure||(!s.scheduled_departure&&s.actual_arrival)?<Icon name="check" size={14}/>:i+1}</div><div><b>{s.station_name}</b><small>{s.stop_status}</small></div><div><small>Scheduled</small><b>{s.scheduled_arrival&&`Arr ${fmtTime(s.scheduled_arrival)}`} {s.scheduled_departure&&`Dep ${fmtTime(s.scheduled_departure)}`}</b></div><div><small>Actual</small><b>{s.actual_arrival&&`Arr ${fmtTime(s.actual_arrival)}`} {s.actual_departure&&`Dep ${fmtTime(s.actual_departure)}`}{!s.actual_arrival&&!s.actual_departure&&'—'}</b></div></div>)}</section>}

function NotificationsPage({user,notifications,reload,onAuth,handleError}){
 if(!user)return <AccessCard title="Sign in to view notifications" copy="Booking confirmation, cancellation and refund messages are stored in Oracle." action="Sign in" onAction={onAuth}/>
 const read=async id=>{try{await api(`/notifications/${id}/read`,{method:'PATCH'});reload()}catch(err){handleError(err)}}
 const readAll=async()=>{try{await api('/notifications/read-all',{method:'PATCH'});reload()}catch(err){handleError(err)}}
 return <main className="page"><div className="page-title"><span className="eyebrow">ACCOUNT ALERTS</span><h1>Notifications</h1><p>Database-backed booking and refund activity.</p></div><div className="notification-toolbar"><button className="secondary" onClick={readAll}>Mark all read</button></div>{!notifications.length?<div className="empty card"><Icon name="bell" size={42}/><h2>No notifications</h2></div>:<div className="notification-list">{notifications.map(n=><article className={`card notification-card ${Number(n.is_read)?'read':'unread'}`} key={n.notification_id}><span><Icon name="bell" size={18}/></span><div><div className="notification-title"><b>{n.title}</b><small>{new Date(n.created_at).toLocaleString()}</small></div><p>{n.message}</p></div>{!Number(n.is_read)&&<button onClick={()=>read(n.notification_id)}>Mark read</button>}</article>)}</div>}</main>
}

function OperatorPanel({user,handleError,setToast}){
 const [date,setDate]=useState(localToday()),[trips,setTrips]=useState([]),[selected,setSelected]=useState(null),[ops,setOps]=useState(null),[loading,setLoading]=useState(false)
 const allowed=user&&['OPERATOR','ADMIN'].includes(user.role)
 const loadTrips=useCallback(async()=>{if(!allowed)return;setLoading(true);try{const data=await api(`/operator/trips?date=${date}`);setTrips(data);if(selected&&!data.some(t=>Number(t.trip_id)===Number(selected)))setSelected(null)}catch(err){handleError(err)}finally{setLoading(false)}},[allowed,date,selected,handleError])
 useEffect(()=>{loadTrips()},[loadTrips])
 const open=async id=>{setSelected(id);setLoading(true);try{setOps(await api(`/operator/trips/${id}`))}catch(err){handleError(err)}finally{setLoading(false)}}
 const mark=async(stop,action)=>{setLoading(true);try{const result=await api(`/operator/trips/${selected}/stops/${stop.trip_stop_id}/${action}`,{method:'POST'});if(action==='depart'&&result.spare?.triggered)setToast(result.spare.trainsetCode?`Delay ${result.delayMinutes} min: spare ${result.spare.trainsetCode} reserved for next opposite trip`:`Delay threshold triggered: ${result.spare.reason}`);else if(result.destinationReached)setToast(`Journey completed: ${result.rotation?.action||'trainset rotation updated'}`);else setToast(`${stop.station_name} ${action==='arrive'?'arrival':'departure'} marked at server time`);setOps(await api(`/operator/trips/${selected}`));await loadTrips()}catch(err){handleError(err)}finally{setLoading(false)}}
 if(!allowed)return <AccessCard title="Operator access required" copy="Only assigned OPERATOR or ADMIN accounts can mark station arrivals/departures."/>
 return <main className="page"><div className="page-title"><span className="eyebrow">OPERATOR CONTROL</span><h1>Station event console</h1><p>Buttons save Oracle server timestamps; schedule values are never shifted by delay.</p></div><div className="operator-toolbar card"><label>Operating date<DatePicker value={date} onChange={setDate}/></label><button className="secondary" onClick={loadTrips}>Refresh</button></div><div className="operator-layout"><aside className="card operator-trip-list"><h3>Assigned trips</h3>{loading&&!trips.length&&<p>Loading…</p>}{!trips.length&&!loading&&<p>No trips assigned for this date.</p>}{trips.map(t=><button className={Number(selected)===Number(t.trip_id)?'active':''} key={t.trip_id} onClick={()=>open(t.trip_id)}><div><b>{t.train_name} <small>#{t.trip_id}</small></b><span>{t.source_station} → {t.destination_station}</span></div><div><strong>{fmtTime(t.scheduled_departure)}</strong><small>{t.trip_status} • {delayText(t.current_delay_minutes)}</small></div></button>)}</aside><section className="card operator-stops">{!ops?<div className="empty"><Icon name="clock" size={38}/><h2>Select a trip</h2><p>Then mark Arrived / Departed in station order.</p></div>:<><div className="section-head"><div><span className="eyebrow">TRIP #{ops.trip.trip_id} • {ops.trip.direction}</span><h2>{ops.live?.train_name}</h2><p>{ops.live?.last_left_station?`Last left ${ops.live.last_left_station} at ${fmtTime(ops.live.last_left_at)}`:'Awaiting first departure'} • {delayText(ops.live?.current_delay_minutes)}</p></div><span className={`delay-badge ${Number(ops.live?.current_delay_minutes)>0?'late':'ontime'}`}>{ops.trip.trip_status}</span></div><div className="operator-stop-list">{ops.stops.map((s,i)=><article className="operator-stop" key={s.trip_stop_id}><div className="stop-dot">{s.actual_departure||(!s.scheduled_departure&&s.actual_arrival)?<Icon name="check" size={14}/>:i+1}</div><div className="operator-stop-main"><b>{s.station_name}</b><span>Scheduled {s.scheduled_arrival&&`Arr ${fmtTime(s.scheduled_arrival)}`} {s.scheduled_departure&&`Dep ${fmtTime(s.scheduled_departure)}`}</span><small>{s.actual_arrival&&`Actual arrival ${fmtTime(s.actual_arrival)}`} {s.actual_departure&&`• Actual departure ${fmtTime(s.actual_departure)}`}</small></div><div className="operator-stop-actions">{s.scheduled_arrival&&!s.actual_arrival&&<button className="secondary" onClick={()=>mark(s,'arrive')}>Arrived</button>}{s.scheduled_departure&&!s.actual_departure&&(!s.scheduled_arrival||s.actual_arrival)&&<button className="primary" onClick={()=>mark(s,'depart')}>Departed</button>}{((s.scheduled_arrival&&s.actual_arrival)&&(!s.scheduled_departure||s.actual_departure))&&<span className="done-label"><Icon name="check" size={15}/> Recorded</span>}</div></article>)}</div></>}</section></div></main>
}

function AdminPanel({user,handleError,setToast}){
 const [routes,setRoutes]=useState([]),[trainsets,setTrainsets]=useState([]),[operators,setOperators]=useState([]),[trips,setTrips]=useState([]),[date,setDate]=useState(localToday()),[form,setForm]=useState({routeId:'',scheduledDeparture:'',operatorUserId:'',trainsetId:''}),[loading,setLoading]=useState(false)
 const allowed=user?.role==='ADMIN'
 const reload=useCallback(async()=>{if(!allowed)return;setLoading(true);try{const [r,ts,op,tr]=await Promise.all([api('/admin/routes'),api('/admin/trainsets'),api('/admin/operators'),api(`/admin/trips?date=${date}`)]);setRoutes(r);setTrainsets(ts);setOperators(op);setTrips(tr);setForm(f=>({...f,routeId:f.routeId||String(r[0]?.route_id||''),operatorUserId:f.operatorUserId||String(op[0]?.user_id||'')}))}catch(err){handleError(err)}finally{setLoading(false)}},[allowed,date,handleError])
 useEffect(()=>{reload()},[reload])
 if(!allowed)return <AccessCard title="Admin access required" copy="Trip creation, trainset status and operator assignment are restricted to ADMIN accounts."/>
 const route=routes.find(r=>Number(r.route_id)===Number(form.routeId));const eligible=trainsets.filter(t=>Number(t.train_id)===Number(route?.train_id)&&t.status==='SPARE'&&Number(t.current_station_id)===Number(route?.source_station_id))
 const createTrip=async e=>{e.preventDefault();if(!form.scheduledDeparture){setToast('Choose a departure date and time');return}setLoading(true);try{const data=await api('/admin/trips',{method:'POST',body:{routeId:Number(form.routeId),scheduledDeparture:new Date(form.scheduledDeparture).toISOString(),operatorUserId:form.operatorUserId?Number(form.operatorUserId):null,trainsetId:form.trainsetId?Number(form.trainsetId):null}});setToast(`Trip #${data.trip_id} created with stops and seat inventory`);setForm(f=>({...f,scheduledDeparture:'',trainsetId:''}));await reload()}catch(err){handleError(err)}finally{setLoading(false)}}
 const assign=async(tripId,operatorUserId)=>{try{await api(`/admin/trips/${tripId}/operator`,{method:'PATCH',body:{operatorUserId:Number(operatorUserId)}});setToast(`Operator assigned to trip #${tripId}`);reload()}catch(err){handleError(err)}}
 return <main className="page"><div className="page-title"><span className="eyebrow">ADMIN OPERATIONS</span><h1>Trips, trainsets & operators</h1><p>Create dated trips from route templates and inspect dynamic ACTIVE / SPARE / RESERVED rotation.</p></div><section className="admin-grid"><form className="card admin-create" onSubmit={createTrip}><h2>Create trip</h2><label>Route<select value={form.routeId} onChange={e=>setForm({...form,routeId:e.target.value,trainsetId:''})}>{routes.map(r=><option key={r.route_id} value={r.route_id}>{r.train_name} • {r.direction} • {r.source_station} → {r.destination_station}</option>)}</select></label><label>Scheduled departure<input type="datetime-local" value={form.scheduledDeparture} onChange={e=>setForm({...form,scheduledDeparture:e.target.value})}/></label><label>Operator<select value={form.operatorUserId} onChange={e=>setForm({...form,operatorUserId:e.target.value})}><option value="">Unassigned</option>{operators.map(o=><option value={o.user_id} key={o.user_id}>{o.full_name} ({o.role})</option>)}</select></label><label>Initial physical trainset<select value={form.trainsetId} onChange={e=>setForm({...form,trainsetId:e.target.value})}><option value="">Create without initial assignment</option>{eligible.map(t=><option value={t.trainset_id} key={t.trainset_id}>{t.trainset_code} • SPARE at {t.current_station}</option>)}</select></label><button className="primary" disabled={loading}>Create trip + materialize stops/seats</button><small>Only SPARE trainsets standing at the selected route source terminal are eligible.</small></form><section className="card fleet-card"><div className="section-head"><div><span className="eyebrow">PHYSICAL FLEET</span><h2>Trainset rotation</h2></div><button className="secondary" onClick={reload}>Refresh</button></div><div className="fleet-list">{trainsets.map(t=><article key={t.trainset_id}><span className={`fleet-dot ${String(t.status).toLowerCase()}`}></span><div><b>{t.trainset_code}</b><small>{t.train_name}</small></div><strong>{t.status}</strong><span>{t.current_station||'Running / no terminal'}</span></article>)}</div></section></section><section className="card admin-trips"><div className="section-head"><div><span className="eyebrow">DATED OPERATIONS</span><h2>Trips & operator assignment</h2></div><DatePicker value={date} onChange={setDate}/></div><div className="admin-table-wrap"><table><thead><tr><th>Trip</th><th>Route</th><th>Time</th><th>Status</th><th>Train status</th><th>Operator</th></tr></thead><tbody>{trips.map(t=><AdminTripRow key={t.trip_id} trip={t} operators={operators} assign={assign}/>)}</tbody></table>{!trips.length&&<p className="empty-inline">No trips for {date}.</p>}</div></section></main>
}

function AdminTripRow({trip,operators,assign}){const [operator,setOperator]=useState(String(trip.operator_user_id||''));return <tr><td><b>#{trip.trip_id}</b><br/><small>{trip.train_name}</small></td><td>{trip.direction}<br/><small>{trip.source_station} → {trip.destination_station}</small></td><td>{fmtTime(trip.scheduled_departure)}<br/><small>{fmtDate(trip.scheduled_departure)}</small></td><td>{trip.trip_status}<br/><small>{delayText(trip.current_delay_minutes)}</small></td><td><small>Last: {trip.last_left_station||'—'}<br/>Next: {trip.next_station||'—'}</small></td><td><div className="inline-assign"><select value={operator} onChange={e=>setOperator(e.target.value)}><option value="">Unassigned</option>{operators.map(o=><option value={o.user_id} key={o.user_id}>{o.full_name}</option>)}</select><button disabled={!operator} onClick={()=>assign(trip.trip_id,operator)}>Assign</button></div></td></tr>}

function Support({setToast}){const [query,setQuery]=useState('');const faq=['How do I book a ticket?','How does live train tracking work?','When is a spare train assigned?','How are refunds handled?','Where can I find my PNR?'];return <main className="page"><div className="page-title"><span className="eyebrow">WE ARE HERE TO HELP</span><h1>How can we help you?</h1><p>Find quick answers or send us a message.</p></div><div className="support-search card"><Icon name="search" size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search help articles..."/></div><div className="support-grid"><section className="card faq"><h2>Frequently asked questions</h2>{faq.filter(q=>q.toLowerCase().includes(query.toLowerCase())).map(q=><details key={q}><summary>{q}</summary><p>{q.includes('tracking')?'An operator marks Arrived/Departed. The server timestamp becomes the actual event time, and users see the last station left plus current delay without GPS.':q.includes('spare')?'At 60 minutes or more delay, the destination-terminal SPARE trainset is reserved for the next opposite-direction trip. The delayed train completes its current journey and becomes the new spare.':q.includes('refund')?'Cancelling a confirmed demo booking creates REFUNDS rows with REQUESTED status for the issued tickets.':'Search a route/date, select a real trip and class, choose segment-available seats, enter passenger details and complete demo payment.'}</p></details>)}</section><form className="card contact" onSubmit={e=>{e.preventDefault();e.currentTarget.reset();setToast('Your support message demo was submitted')}}><h2>Contact support</h2><label>Name<input required placeholder="Your name"/></label><label>Email<input required type="email" placeholder="you@example.com"/></label><label>Topic<select><option>Booking issue</option><option>Payment</option><option>Live tracking</option><option>Cancellation / refund</option></select></label><label>Message<textarea required rows="5" placeholder="Tell us how we can help"></textarea></label><button className="primary">Send message <Icon name="arrow" size={17}/></button></form></div></main>}

function AuthModal({mode,setMode,close,onSuccess}){
 const [loading,setLoading]=useState(false),[error,setError]=useState('')
 const submit=async e=>{e.preventDefault();setLoading(true);setError('');const f=new FormData(e.currentTarget);try{const data=mode==='signin'?await api('/auth/login',{method:'POST',token:'',body:{email:f.get('email'),password:f.get('password')}}):await api('/auth/register',{method:'POST',token:'',body:{fullName:f.get('name'),email:f.get('email'),phone:f.get('phone'),password:f.get('password')}});await onSuccess(data)}catch(err){setError(err.message)}finally{setLoading(false)}}
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><button className="modal-close" onClick={close}><Icon name="close" size={20}/></button><div className="modal-visual"><span className="brand-mark"><Icon name="train" size={23}/></span><h2>Welcome aboard!</h2><p>Passenger, Operator and Admin roles authenticate through the Express/Oracle backend.</p><img src={heroTrain} alt="Train"/></div><form onSubmit={submit}><div className="auth-tabs"><button type="button" className={mode==='signin'?'active':''} onClick={()=>setMode('signin')}>Sign in</button><button type="button" className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Create account</button></div>{mode==='register'&&<><label>Full name<input name="name" required placeholder="Your full name"/></label><label>Phone<input name="phone" placeholder="01XXXXXXXXX"/></label></>}<label>Email<input name="email" type="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" required minLength="8" placeholder="••••••••"/></label>{error&&<div className="form-error">{error}</div>}<button className="primary full" disabled={loading}>{loading?'Please wait…':mode==='signin'?'Sign in':'Create passenger account'}</button><small className="demo-note">Demo operator: operator@ferrovia.local / Operator123!<br/>Demo admin: admin@ferrovia.local / Admin123!</small></form></div></div>
}

function TrainDetail({train,close,choose}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="detail-modal card"><button className="modal-close" onClick={close}><Icon name="close" size={20}/></button><div className="detail-hero"><span className="train-badge"><Icon name="train" size={24}/></span><div><h2>{train.train_name}</h2><p>{train.train_code} • {train.train_type} • {train.direction}</p></div><span className={`live-pill ${Number(train.current_delay_minutes)>0?'late':'ontime'}`}>{delayText(train.current_delay_minutes)}</span></div><div className="detail-route"><div><b>{fmtTime(train.scheduled_departure)}</b><span>{train.source_station}</span></div><div><i></i><Icon name="train" size={20}/><small>{durationText(train.scheduled_departure,train.scheduled_arrival)}</small><i></i></div><div><b>{fmtTime(train.scheduled_arrival)}</b><span>{train.destination_station}</span></div></div>{train.last_left_station&&<p className="detail-live-copy">Last station left: <b>{train.last_left_station}</b> at {fmtTime(train.last_left_at)}.</p>}<h3>Available classes</h3><div className="detail-classes">{(train.classes||[]).map(c=><button key={c.classId} disabled={!c.availableSeats} onClick={()=>choose(c)}><span><b>{c.className}</b><small>{c.availableSeats} seats available</small></span><strong>{money(c.farePerPassenger)}</strong></button>)}</div></div></div>}

function BookingModal({booking,close}){const people=booking.passengers||[];return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="detail-modal card"><button className="modal-close" onClick={close}><Icon name="close" size={20}/></button><span className="eyebrow">PNR {booking.pnr_number}</span><h2>{booking.train_name}</h2><div className="booking-detail-grid"><span>Journey<b>{booking.source_station} → {booking.destination_station}</b></span><span>Departure<b>{fmtDate(booking.scheduled_departure)} {fmtTime(booking.scheduled_departure)}</b></span><span>Class<b>{booking.class_name}</b></span><span>Status<b>{booking.booking_status}</b></span><span>Passengers<b>{people.map(p=>p.passenger_name).join(', ')}</b></span><span>Total<b>{money(booking.total_fare)}</b></span></div><div className="passenger-ticket-list">{people.map(p=><div key={p.passenger_id}><span><b>{p.passenger_name}</b><small>{p.age} • {p.gender}</small></span><span>Seat <b>{p.coach_code}-{p.seat_number}</b></span><span>Ticket <b>{p.ticket_status||'—'}</b>{p.refund_status&&<small>Refund: {p.refund_status} ({money(p.refund_amount)})</small>}</span></div>)}</div><button className="primary full" onClick={()=>window.print()}><Icon name="print" size={17}/> Print ticket</button></div></div>}

function AccessCard({title,copy,action,onAction}){return <main className="page"><div className="empty card access-card"><Icon name="shield" size={44}/><h2>{title}</h2><p>{copy}</p>{action&&<button className="primary" onClick={onAction}>{action}</button>}</div></main>}

export default App
