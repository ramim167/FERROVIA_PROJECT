import { useEffect, useState } from 'react'
import { Icon } from './Icons'

export default function Navbar({ page, navigate, user, onAuth, onLogout, notificationCount=0 }) {
  const [open,setOpen]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const [scrolled,setScrolled]=useState(false)
  const links=[
    ['home','Home','home'],
    ['search','Book Ticket','ticket'],
    ['track','Track Train','train'],
    ['dashboard','Dashboard','chart'],
    ['tickets','My Tickets','ticket'],
    ...(user&&['OPERATOR','ADMIN'].includes(user.role)?[['operator','Operator','clock']]:[]),
    ...(user?.role==='ADMIN'?[['admin','Admin','shield']]:[]),
    ['support','Support','support'],
  ]
  const go=key=>{navigate(key);setOpen(false);setProfileOpen(false)}
  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>18)
    onScroll();window.addEventListener('scroll',onScroll,{passive:true})
    return()=>window.removeEventListener('scroll',onScroll)
  },[])
  return <header className={`navbar-shell ${scrolled?'scrolled':''}`}>
    <div className="navbar">
      <button className="brand" onClick={()=>go('home')} aria-label="Home">
        <span className="brand-mark"><Icon name="train" size={23}/></span>
        <span><b>FERROVIA</b><small>Bangladesh travel, reimagined</small></span>
      </button>
      <nav className={open?'open':''}>{links.map(([key,label,icon])=><button key={key} className={page===key?'active':''} onClick={()=>go(key)}><Icon name={icon} size={17}/><span>{label}</span></button>)}</nav>
      <div className="nav-actions">
        <button className="icon-button notification" title="Notifications" onClick={()=>user?go('notifications'):onAuth()}><Icon name="bell" size={19}/>{notificationCount>0&&<i>{notificationCount>9?'9+':notificationCount}</i>}</button>
        <div className="profile-wrap">
          <button className="user-chip" onClick={()=>user?setProfileOpen(v=>!v):onAuth()}>
            <span className="avatar">{user?.full_name?.[0]?.toUpperCase()||<Icon name="user" size={18}/>}</span>
            <span className="user-copy"><b>{user?.full_name||'Sign in'}</b><small>{user?`${user.role} account`:'Register or continue'}</small></span>
          </button>
          {profileOpen&&user&&<div className="profile-menu card">
            <button onClick={()=>go('dashboard')}><Icon name="chart" size={17}/> Travel dashboard</button>
            <button onClick={()=>go('notifications')}><Icon name="bell" size={17}/> Notifications</button>
            {['OPERATOR','ADMIN'].includes(user.role)&&<button onClick={()=>go('operator')}><Icon name="clock" size={17}/> Operator console</button>}
            {user.role==='ADMIN'&&<button onClick={()=>go('admin')}><Icon name="shield" size={17}/> Admin operations</button>}
            <button onClick={()=>{onLogout();setProfileOpen(false)}}><Icon name="logout" size={17}/> Sign out</button>
          </div>}
        </div>
        <button className="menu-button" onClick={()=>setOpen(v=>!v)} aria-label="Toggle menu"><Icon name={open?'close':'menu'} size={22}/></button>
      </div>
    </div>
  </header>
}
