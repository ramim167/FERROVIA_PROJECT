import { Icon } from './Icons'

export default function Footer(){
 const jump=(id)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'})
 const openSocial=(name)=>alert(`${name} page will be connected here.`)
 return <footer>
  <div className="footer-glow"></div>
  <div className="footer-grid">
    <div>
      <div className="footer-brand"><span className="brand-mark"><Icon name="train" size={20}/></span><b>FERROVIA</b></div>
      <p>A modern railway travel workspace for discovering routes, booking seats, managing journeys and receiving timely assistance across Bangladesh.</p>
      <div className="social-row" aria-label="Social media links">
        <button type="button" aria-label="Facebook" title="Facebook" onClick={()=>openSocial('Facebook')}><Icon name="facebook" size={17}/></button>
        <button type="button" aria-label="LinkedIn" title="LinkedIn" onClick={()=>openSocial('LinkedIn')}><Icon name="linkedin" size={17}/></button>
        <button type="button" aria-label="Instagram" title="Instagram" onClick={()=>openSocial('Instagram')}><Icon name="instagram" size={17}/></button>
      </div>
    </div>
    <div><b>Explore</b><button onClick={()=>jump('root')}>Home</button><button onClick={()=>jump('root')}>Book Ticket</button><button onClick={()=>jump('root')}>Train Schedule</button></div>
    <div><b>Assistance</b><button onClick={()=>alert('Support demo')}>Contact Support</button><button onClick={()=>alert('Refund policy: demo project')}>Refund Policy</button><button onClick={()=>alert('FAQ section is available on Support page')}>Frequently Asked</button></div>
    <div><b>Contact</b><span>☎ 16318</span><span>✉ support@railwayticket.bd</span><span>Dhaka, Bangladesh</span></div>
  </div>
  <div className="footer-bottom"><span>© 2026 FERROVIA. Academic product demonstration.</span><span>Privacy · Terms · Accessibility</span></div>
 </footer>
}
