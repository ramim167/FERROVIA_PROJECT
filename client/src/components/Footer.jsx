import { Icon } from './Icons'

export default function Footer({navigate}){
 const go=p=>{navigate?.(p);window.scrollTo({top:0,behavior:'smooth'})}
 return <footer>
  <div className="footer-glow"></div>
  <div className="footer-grid">
    <div>
      <div className="footer-brand"><span className="brand-mark"><Icon name="train" size={20}/></span><b>FERROVIA</b></div>
      <p>A modern Oracle-backed railway workspace for booking, live operational tracking, trainset rotation and passenger support.</p>
      <div className="social-row" aria-label="Project links"><button type="button" title="Academic project"><Icon name="shield" size={17}/></button><button type="button" title="Rail operations"><Icon name="train" size={17}/></button><button type="button" title="Database system"><Icon name="chart" size={17}/></button></div>
    </div>
    <div><b>Explore</b><button onClick={()=>go('home')}>Home</button><button onClick={()=>go('search')}>Book Ticket</button><button onClick={()=>go('track')}>Track Train</button></div>
    <div><b>Assistance</b><button onClick={()=>go('tickets')}>My Tickets</button><button onClick={()=>go('notifications')}>Notifications</button><button onClick={()=>go('support')}>Frequently Asked</button></div>
    <div><b>Contact</b><span>☎ 16318</span><span>✉ support@ferrovia.local</span><span>Dhaka, Bangladesh</span></div>
  </div>
  <div className="footer-bottom"><span>© 2026 FERROVIA. Academic product demonstration.</span><span>React · Express · Oracle</span></div>
 </footer>
}
