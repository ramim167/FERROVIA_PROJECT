import { useEffect, useState } from 'react'
import { Icon } from './Icons'

export default function Navbar({ page, navigate, user, onAuth, onLogout }) {
  const [open,setOpen]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const [scrolled,setScrolled]=useState(false)
  const links = [['home','Home','home'],['search','Book Ticket','ticket'],['dashboard','Dashboard','chart'],['tickets','My Tickets','ticket'],['support','Support','support']]
  const go=(key)=>{navigate(key);setOpen(false)}
  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>18)
    onScroll()
    window.addEventListener('scroll',onScroll,{passive:true})
    return ()=>window.removeEventListener('scroll',onScroll)
  },[])
  return <header className={`navbar-shell ${scrolled?'scrolled':''}`}>
    <div className="navbar">
      <button className="brand" onClick={() => go('home')} aria-label="Home">
        <span className="brand-mark"><Icon name="train" size={23}/></span>
        <span><b>FERROVIA</b><small>Bangladesh travel, reimagined</small></span>
      </button>
      <nav className={open?'open':''}>{links.map(([key,label,icon]) => <button key={key} className={page===key?'active':''} onClick={() => go(key)}><Icon name={icon} size={17}/><span>{label}</span></button>)}</nav>
      <div className="nav-actions">
        <button className="icon-button notification" title="Notifications" onClick={()=>navigate('dashboard')}><Icon name="bell" size={19}/><i>2</i></button>
        <div className="profile-wrap">
          <button className="user-chip" onClick={()=>user?setProfileOpen(v=>!v):onAuth()}>
            <span className="avatar">{user?.name?.[0]?.toUpperCase() || <Icon name="user" size={18}/>}</span>
            <span className="user-copy"><b>{user?.name || 'Sign in'}</b><small>{user ? 'Passenger account' : 'Register or continue'}</small></span>
          </button>
          {profileOpen&&user&&<div className="profile-menu card">
            <button onClick={()=>{navigate('dashboard');setProfileOpen(false)}}><Icon name="chart" size={17}/> Travel dashboard</button>
            <button onClick={()=>{onLogout();setProfileOpen(false)}}><Icon name="logout" size={17}/> Sign out</button>
          </div>}
        </div>
        <button className="menu-button" onClick={()=>setOpen(v=>!v)} aria-label="Toggle menu"><Icon name={open?'close':'menu'} size={22}/></button>
      </div>
    </div>
  </header>
}
