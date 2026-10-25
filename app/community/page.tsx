"use client";

import { useMemo, useState } from "react";

type Post = { id: number; category: string; title: string; body: string; date: string; likes: number };

const initialPosts: Post[] = [
  { id: 1, category: "GUIDANCE", title: "Getting ready to apply", body: "Before you begin, gather the information requested on the application and review every answer carefully. Only submit information you can verify.", date: "Community guidance", likes: 12 },
  { id: 2, category: "SAFETY", title: "Protect your personal information", body: "Never post bank passwords, full card details, or Social Security numbers in public comments. Use only the official support channel for questions about your submission.", date: "Safety reminder", likes: 18 },
  { id: 3, category: "UPDATES", title: "Track an application", body: "If you have already submitted an application, use the application tracking page and keep your reference number somewhere safe.", date: "Helpful tip", likes: 9 },
];

export default function CommunityPage() {
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<"All" | "Photos" | "Reels">("All");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const posts = useMemo(() => initialPosts.filter(p => (p.title + " " + p.body + " " + p.category).toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <main className="community">
      <style jsx>{`
        * { box-sizing: border-box; }
        .community { min-height: 100vh; background: #f0f2f5; color: #172033; font-family: Arial, Helvetica, sans-serif; }
        .topbar { height: 64px; background: #fff; display:flex; align-items:center; justify-content:space-between; padding: 0 max(18px, calc((100vw - 1080px)/2)); border-bottom:1px solid #e5e7eb; position:sticky; top:0; z-index:5; }
        .brand { font-size:20px; font-weight:850; letter-spacing:-.6px; color:#123b66; } .brand span { color:#16a085; }
        .toplinks { display:flex; gap:18px; align-items:center; } .toplinks a { color:#334155; text-decoration:none; font-size:14px; font-weight:700; }
        .hero { max-width:1000px; margin:20px auto 0; background:white; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px #00000010; }
        .cover { height:230px; background:linear-gradient(120deg,#0b2440,#155e75 58%,#23a88b); position:relative; padding:30px; color:white; display:flex; align-items:flex-end; }
        .cover:before,.cover:after { content:""; position:absolute; border:1px solid #ffffff28; border-radius:50%; width:330px; height:330px; right:8%; top:-170px; }
        .cover:after { width:230px; height:230px; right:18%; top:-100px; }
        .covercopy { position:relative; z-index:1; max-width:560px; } .eyebrow { font-size:11px; letter-spacing:2px; font-weight:800; opacity:.8; } .cover h1 { margin:8px 0 7px; font-size:clamp(25px,4vw,38px); letter-spacing:-1px; } .cover p { margin:0; line-height:1.5; color:#e1f4f4; max-width:510px; font-size:14px; }
        .profile { padding:0 28px 22px; display:flex; align-items:flex-end; gap:18px; } .avatar { width:112px; height:112px; border:5px solid white; border-radius:50%; background:#e3f5f1; color:#0b5a58; display:grid; place-items:center; font-weight:900; font-size:31px; margin-top:-43px; flex-shrink:0; box-shadow:0 1px 4px #0002; }
        .identity { flex:1; padding:12px 0 0; } .identity h2 { margin:0 0 7px; font-size:27px; letter-spacing:-.7px; } .identity p { margin:0; color:#64748b; font-size:14px; line-height:1.5; } .stats { margin-top:9px; font-size:13px; color:#526174; } .actions { display:flex; gap:9px; padding-bottom:2px; }
        button { font:inherit; cursor:pointer; } .btn { border:0; border-radius:8px; padding:11px 16px; font-weight:750; } .primary { background:#1769aa; color:white; } .secondary { background:#e8eef5; color:#1e3a56; }
        .tabs { display:flex; gap:0; padding:0 20px; border-top:1px solid #edf0f3; } .tab { padding:17px 24px; border:0; border-bottom:3px solid transparent; background:transparent; color:#657184; font-weight:750; } .tab.active { color:#1769aa; border-bottom-color:#1769aa; }
        .layout { max-width:1000px; margin:18px auto 40px; display:grid; grid-template-columns:300px minmax(0,1fr); gap:18px; padding:0 12px; } .card { background:white; border-radius:12px; padding:20px; box-shadow:0 1px 3px #0000000c; margin-bottom:14px; } .card h3 { margin:0 0 14px; font-size:17px; } .aboutrow { padding:10px 0; border-bottom:1px solid #eef1f4; color:#526174; font-size:13px; line-height:1.5; } .aboutrow:last-child { border:0; } .notice { background:#fff8e7; border:1px solid #f1dfad; padding:12px; border-radius:9px; font-size:12px; line-height:1.55; color:#75551a; }
        .search { width:100%; border:1px solid #dce2e9; border-radius:9px; padding:12px 14px; font-size:14px; outline-color:#1769aa; margin-bottom:14px; } .post { padding:20px; margin-bottom:14px; } .posthead { display:flex; gap:10px; align-items:center; margin-bottom:14px; } .miniavatar { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; background:#e1f2ee; color:#0f6d61; font-weight:900; } .posthead strong { display:block; font-size:14px; } .posthead small { display:block; color:#718096; font-size:12px; margin-top:4px; } .badge { margin-left:auto; background:#e8f4f1; color:#087b69; border-radius:20px; padding:6px 9px; font-size:10px; font-weight:850; letter-spacing:.5px; } .post h3 { margin:0 0 8px; font-size:19px; } .post p { color:#4b596b; font-size:14px; line-height:1.7; margin:0; } .postactions { display:flex; gap:10px; padding-top:16px; margin-top:16px; border-top:1px solid #eef1f4; } .postactions button { border:0; background:transparent; color:#526174; font-weight:700; font-size:13px; padding:4px 8px; } .empty { text-align:center; color:#64748b; padding:28px; background:white; border-radius:12px; } .footer { text-align:center; padding:18px; color:#738093; font-size:12px; } .footer a { color:#315e84; margin:0 7px; text-decoration:none; }
        @media(max-width:700px) { .topbar { height:58px; padding:0 16px; } .toplinks { gap:10px; } .toplinks a { font-size:12px; } .hero { margin:10px 8px 0; border-radius:10px; } .cover { height:205px; padding:20px; } .profile { padding:0 16px 18px; gap:12px; flex-wrap:wrap; align-items:center; } .avatar { width:86px; height:86px; font-size:25px; margin-top:-30px; } .identity { min-width:calc(100% - 105px); padding-top:8px; } .identity h2 { font-size:22px; } .identity p { font-size:12px; } .actions { width:100%; padding:0; } .actions .btn { flex:1; } .tabs { padding:0 4px; } .tab { flex:1; padding:15px 6px; font-size:13px; } .layout { grid-template-columns:1fr; gap:0; margin-top:12px; padding:0 8px; } .layout aside { order:2; } .layout section { order:1; } .card { padding:16px; } }
      `}</style>
      <header className="topbar">
        <a className="brand" href="/" aria-label="HOPEBRIDGE home">HOPE<span>BRIDGE</span></a>
        <nav className="toplinks"><a href="/">Home</a><a href="/apply">Apply</a><a href="/status">Track status</a></nav>
      </header>
      <section className="hero">
        <div className="cover"><div className="covercopy"><div className="eyebrow">COMMUNITY • INFORMATION • SUPPORT</div><h1>Support starts with clear information.</h1><p>Practical guidance to help you navigate the HOPEBRIDGE application process safely and confidently.</p></div></div>
        <div className="profile"><div className="avatar" aria-label="HOPEBRIDGE logo">HB</div><div className="identity"><h2>HOPEBRIDGE Community</h2><p>Official community information page · Application guidance and support</p><div className="stats"><strong>Community updates</strong> · Public information</div></div><div className="actions"><button className="btn primary" onClick={() => { setFollowing(!following); setNotice(following ? "You unfollowed community updates on this device." : "You are following community updates on this device."); }}>{following ? "✓ Following" : "+ Follow"}</button><a className="btn secondary" style={{textDecoration:"none",display:"inline-flex",alignItems:"center"}} href="/chat">Message support</a></div></div>
        <div className="tabs" role="tablist" aria-label="Community sections">{(["All","Photos","Reels"] as const).map(t=><button key={t} role="tab" aria-selected={tab===t} className={`tab ${tab===t?"active":""}`} onClick={()=>{setTab(t); if(t!=="All")setNotice(t+" posts are not available yet. Showing verified text updates instead.");}}>{t}</button>)}</div>
      </section>
      <div className="layout">
        <aside>
          <div className="card"><h3>About this page</h3><div className="aboutrow">ℹ️ Clear information about the application process.</div><div className="aboutrow">💬 Contact support for help with your submission.</div><div className="aboutrow">🛡️ Keep private and financial details out of public posts.</div><div className="aboutrow">🌐 Public information page</div></div>
          <div className="card"><h3>Important information</h3><div className="notice">Submitting an application does not guarantee approval or funding. Never pay an individual who promises guaranteed approval or release of assistance. Confirm any fee through independently verified official channels before paying.</div></div>
        </aside>
        <section>
          <input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search community updates…" aria-label="Search community updates" />
          {notice && <div className="card" style={{fontSize:13,color:"#35506c",padding:12,marginBottom:12}} role="status">{notice}<button onClick={()=>setNotice("")} style={{float:"right",border:0,background:"transparent"}} aria-label="Dismiss notice">✕</button></div>}
          {tab!=="All" && <div className="card" style={{fontSize:13,color:"#64748b"}}>Photo and video publishing will be enabled when approved media are configured. For now, browse the available text updates.</div>}
          {posts.length ? posts.map(post=><article className="card post" key={post.id}><div className="posthead"><div className="miniavatar">HB</div><div><strong>HOPEBRIDGE Community</strong><small>{post.date}</small></div><span className="badge">{post.category}</span></div><h3>{post.title}</h3><p>{post.body}</p><div className="postactions"><button onClick={()=>setLiked(prev=>prev.includes(post.id)?prev.filter(id=>id!==post.id):[...prev,post.id])}>{liked.includes(post.id)?"♥ Liked":"♡ Like"} · {post.likes+(liked.includes(post.id)?1:0)}</button><button onClick={()=>setNotice("For private questions, please use Message support. Public comments are not enabled on this page.")}>▢ Comment</button><button onClick={()=>{if(typeof navigator!=="undefined"&&navigator.share) navigator.share({title:post.title,text:post.body,url:window.location.href}).catch(()=>{}); else setNotice("Copy this page link from your browser to share the community.");}}>↗ Share</button></div></article>) : <div className="empty">No updates match your search.</div>}
        </section>
      </div>
      <footer className="footer">HOPEBRIDGE Community · Information only · No guaranteed outcomes<br/><br/><a href="/">Home</a><a href="/apply">Apply</a><a href="/status">Track application</a><a href="/chat">Contact support</a><a href="/privacy">Privacy</a></footer>
    </main>
  );
}
