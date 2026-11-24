"use client";

import { useEffect, useRef, useState } from "react";
import { TEXT, DEMO_SPEAKER, DEMO_TODAY } from "@/lib/speakerI18n";

const SECTION_OF_STEP = { 1: "profile", 2: "talk" };
const PROFILE_KEYS = ["name", "nameEn", "email", "phone", "organization", "position", "bio", "photo", "consentPrivacy"];
const TALK_KEYS = ["session", "title", "summary", "material", "rehearsal", "recording", "request"];

// 디자인 미리보기 (?demo=…, 언어는 ?lang=en)
//  link   : 개인 링크로 처음 들어온 연사
//  return : 기본정보만 제출하고 다시 들어온 연사
//  final  : 모두 제출했고 "최종 안내"가 열린 연사

function parseAt(s) {
  const m = String(s || "").match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

function validate(step, v, t) {
  const e = {};
  const E = t.err;
  if (step === 0 && !v.guideRead) e.guideRead = E.guideRead;
  if (step === 1) {
    if (!v.name.trim()) e.name = E.name;
    if (!EMAIL_RE.test(v.email.trim())) e.email = E.email;
    if (!PHONE_RE.test(v.phone.trim())) e.phone = E.phone;
    if (!v.organization.trim()) e.organization = E.organization;
    if (!v.position.trim()) e.position = E.position;
    if (!v.photo) e.photo = E.photo;
    if (v.bio.trim().length < 20) e.bio = E.bio;
    if (!v.consentPrivacy) e.consentPrivacy = E.consentPrivacy;
  }
  if (step === 2) {
    if (!v.title.trim()) e.title = E.title;
    if (v.summary.trim().length < 20) e.summary = E.summary;
  }
  return e;
}

export default function SpeakerWizard({ lang = "ko" }) {
  const t = TEXT[lang];
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState({ profile: null, talk: null }); // 제출 시각
  const [dirty, setDirty] = useState({ profile: false, talk: false }); // 제출 뒤 고친 내용이 있는지
  const [justSaved, setJustSaved] = useState(null);
  const [returning, setReturning] = useState(false);
  const [invited, setInvited] = useState(false); // 개인 링크로 들어왔는지
  const [finalOpen, setFinalOpen] = useState(false); // 담당자가 최종 안내를 공개했는지
  const [sessionInfo, setSessionInfo] = useState(null); // 담당자가 연사별로 넣는 세션 정보
  const [deadlines, setDeadlines] = useState(null); // 연사별 마감일 { register, travel, slides } (YYYY-MM-DD)
  const [today, setToday] = useState(() => new Date());
  const [token, setToken] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const [resendOpen, setResendOpen] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const topRef = useRef(null);
  const [v, setV] = useState({
    guideRead: false,
    name: "", nameEn: "", email: "", phone: "", organization: "", position: "", bio: "", photo: null, consentPrivacy: false,
    session: "", title: "", summary: "", material: null, rehearsal: [], recording: "yes", request: "",
  });

  useEffect(() => () => preview && preview.startsWith("blob:") && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    const tk = params.get("t");
    if (tk) { loadSpeaker(tk); return; }
    if (!demo) return;
    const d = DEMO_SPEAKER[lang];
    setDemoMode(true);
    setInvited(true);
    setSessionInfo(d.session);
    setDeadlines(d.deadlines);
    setToday(new Date(DEMO_TODAY + "T09:00:00"));
    if (demo === "link") setV((s) => ({ ...s, name: d.name, email: d.email }));
    if (demo === "return" || demo === "final") {
      setV((s) => ({ ...s, ...d, session: d.session.forum, photo: { name: "profile.jpg" }, consentPrivacy: true, guideRead: true }));
      setSubmitted({ profile: new Date(2026, 10, 24, 13, 40), talk: null });
      setStarted(true);
      setReturning(true);
      setStep(2);
    }
    if (demo === "final") {
      setV((s) => ({ ...s, title: d.session.agenda, summary: lang === "en" ? "Progress and outcomes of MFDS NAMs R&D, and our strategy for K-DDT, AI-based evaluation platforms and global regulatory collaboration." : "식약처 NAMs R&D 추진현황과 성과, K-DDT 구축·AI 기반 평가 플랫폼·글로벌 규제기관 협력 등 향후 추진전략을 소개합니다.", material: { name: "slides.pptx" } }));
      setSubmitted({ profile: new Date(2026, 10, 24, 13, 40), talk: new Date(2026, 10, 26, 10, 5) });
      setFinalOpen(true);
      setStep(4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 개인 링크(?t=…)로 들어오면 시트에 저장된 내용을 불러옵니다.
  async function loadSpeaker(tk) {
    setLoading(true);
    try {
      const res = await fetch(`/api/speaker?t=${encodeURIComponent(tk)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) { setLinkError(data.message || t.linkErrorTitle); return; }
      const sp = data.speaker;
      setToken(tk);
      setInvited(true);
      setV((s) => ({
        ...s,
        name: sp.name, email: sp.email, nameEn: sp.nameEn, phone: sp.phone, organization: sp.organization,
        position: sp.position, bio: sp.bio, consentPrivacy: !!sp.consent,
        photo: sp.photoUrl ? { name: "photo", url: sp.photoUrl } : null,
        session: sp.session, title: sp.title, summary: sp.summary,
        material: sp.materialUrl ? { name: "slides", url: sp.materialUrl } : null,
        rehearsal: sp.rehearsal ? sp.rehearsal.split(", ").filter(Boolean) : [],
        recording: sp.recording === "동의하지 않음" ? "no" : "yes", request: sp.request,
      }));
      if (sp.photoUrl) setPreview(sp.photoUrl);
      const sub = { profile: parseAt(sp.profileAt), talk: parseAt(sp.talkAt) };
      setSubmitted(sub);
      if (sub.profile || sub.talk) {
        setReturning(true);
        setStarted(true);
        setV((s) => ({ ...s, guideRead: true }));
        setStep(!sub.profile ? 1 : !sub.talk ? 2 : 3);
      }
    } catch {
      setLinkError(t.linkErrorTitle);
    } finally {
      setLoading(false);
    }
  }

  function set(name, value) {
    setV((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    const sec = PROFILE_KEYS.includes(name) ? "profile" : TALK_KEYS.includes(name) ? "talk" : null;
    if (sec) { setDirty((d) => ({ ...d, [sec]: true })); setJustSaved(null); }
  }
  const onInput = (e) => set(e.target.name, e.target.type === "checkbox" ? e.target.checked : e.target.value);

  function go(next) {
    setStep(next);
    setErrors({});
    setJustSaved(null);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function check() {
    const e = validate(step, v, t);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`s-${Object.keys(e)[0]}`)?.focus();
      return false;
    }
    return true;
  }

  function start() {
    if (!check()) return;
    setStarted(true);
    go(1);
  }

  function markSaved(sec, at) {
    setSubmitted((s) => ({ ...s, [sec]: at }));
    setDirty((d) => ({ ...d, [sec]: false }));
    setJustSaved(sec);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveSection() {
    setServerMessage("");
    if (!check()) return;
    const sec = SECTION_OF_STEP[step];
    setSending(true);
    if (!token) {
      // 디자인 미리보기: 실제 저장 없이 저장된 것처럼 보여줍니다.
      setTimeout(() => { setSending(false); markSaved(sec, new Date()); }, 500);
      return;
    }
    const fd = new FormData();
    fd.set("t", token);
    fd.set("section", sec);
    if (sec === "profile") {
      for (const k of ["nameEn", "phone", "organization", "position", "bio"]) fd.set(k, v[k] || "");
      fd.set("consentPrivacy", v.consentPrivacy ? "true" : "");
      if (v.photo instanceof File) fd.set("photo", v.photo);
      else fd.set("hasPhoto", v.photo ? "true" : "");
    } else {
      for (const k of ["session", "title", "summary", "recording", "request"]) fd.set(k, v[k] || "");
      v.rehearsal.forEach((r) => fd.append("rehearsal", r));
      if (v.material instanceof File) fd.set("material", v.material);
    }
    try {
      const res = await fetch("/api/speaker", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ ok: false, message: "Server error" }));
      if (!data.ok) {
        setErrors(data.errors || {});
        setServerMessage(data.message || "Error");
        return;
      }
      const sp = data.speaker;
      if (sec === "profile" && sp.photoUrl) setV((s) => ({ ...s, photo: s.photo instanceof File ? s.photo : { name: "photo", url: sp.photoUrl } }));
      if (sec === "talk" && sp.materialUrl) setV((s) => ({ ...s, material: { name: s.material?.name || "slides", url: sp.materialUrl } }));
      markSaved(sec, parseAt(sec === "profile" ? sp.profileAt : sp.talkAt) || new Date());
    } catch {
      setServerMessage(lang === "en" ? "Please check your connection and try again." : "네트워크 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  function stateOf(i) {
    if (i === 0) return started ? "done" : step === 0 ? "current" : "todo";
    if (i === 3) return submitted.profile && submitted.talk && !dirty.profile && !dirty.talk ? "done" : "todo";
    if (i === 4) return "final";
    const sec = SECTION_OF_STEP[i];
    if (submitted[sec] && !dirty[sec]) return "done";
    if (dirty[sec]) return "draft";
    return "todo";
  }

  function toggleRehearsal(opt) {
    set("rehearsal", v.rehearsal.includes(opt) ? v.rehearsal.filter((x) => x !== opt) : [...v.rehearsal, opt]);
  }

  function onPhoto(e) {
    const f = e.target.files?.[0] || null;
    set("photo", f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  if (loading || linkError) {
    return (
      <section className="card wizard" ref={topRef}>
        <div className="panel center">
          {loading ? <p className="muted">{t.loading}</p> : (
            <>
              <h2>{t.linkErrorTitle}</h2>
              <p className="muted">{linkError}</p>
              <p><a className="btn ghost" href="/speaker">{t.resumeBtn}</a></p>
            </>
          )}
        </div>
      </section>
    );
  }

  const err = (k) => errors[k] && <p className="error" id={`e-${k}`}>{errors[k]}</p>;
  const steps = t.steps.slice(0, finalOpen ? 5 : 4);
  const F = t.final;

  return (
    <section className="card wizard" ref={topRef}>
      {demoMode && <p className="preview-badge">{t.previewBadge}</p>}

      {!invited && (
        <div className="resume">
          {!resendOpen ? (
            <p>{t.resumeIntro(<button type="button" className="link" onClick={() => setResendOpen(true)}>{t.resumeBtn}</button>)}</p>
          ) : resendSent ? (
            <p role="status">{t.resumeSent}</p>
          ) : (
            <form className="resume-form" onSubmit={async (e) => {
              e.preventDefault();
              const email = e.currentTarget.elements.resendEmail.value;
              await fetch("/api/speaker/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {});
              setResendSent(true);
            }}>
              <label htmlFor="s-resendEmail">{t.resumeLabel}</label>
              <div>
                <input id="s-resendEmail" name="resendEmail" type="email" placeholder="name@company.com" required />
                <button type="submit" className="btn ghost">{t.resumeSubmit}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {invited && (
        <div className={`welcome ${finalOpen ? "final" : ""}`} role="status">
          {finalOpen ? t.welcomeFinal(v.name) : returning ? t.welcomeBack(v.name) : t.welcome(v.name)}
        </div>
      )}

      <ol className={`steps ${finalOpen ? "five" : ""}`} role="tablist">
        {steps.map(([label, short], i) => {
          const st = stateOf(i);
          const locked = i > 0 && (!started || !invited);
          const sec = SECTION_OF_STEP[i];
          const note = st === "final" ? t.note.new
            : st === "done" && sec ? t.note.done
            : st === "draft" ? (submitted[sec] ? t.note.editing : t.note.draft)
            : sec ? t.note.todo : "";
          return (
            <li key={label} className={`step ${st} ${i === step ? "current" : ""} ${locked ? "locked" : ""}`}>
              <button type="button" role="tab" aria-selected={i === step} disabled={locked} onClick={() => go(i)}>
                <span className="num">{st === "final" ? "★" : st === "done" ? "✓" : st === "draft" ? "✎" : i + 1}</span>
                <span className="lbl">
                  <span className="lbl-long">{label}</span><span className="lbl-short">{short}</span>
                  {note && <span className={`state-note ${st}`}>{note}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="progress" aria-hidden><span style={{ width: `${(step / (steps.length - 1)) * 100}%` }} /></div>

      {justSaved && (
        <div className="saved" role="status">
          <b>{justSaved === "profile" ? t.savedProfile : t.savedTalk}</b>
          {justSaved === "profile" && !submitted.talk ? t.savedProfileMore : t.savedMore}
        </div>
      )}

      <div className="panel" role="tabpanel">
        {step === 0 && (
          <>
            <h2>{t.guideTitle}</h2>
            <p className="muted">{t.guideSub}</p>

            <h3 className="sub">{deadlines ? t.myScheduleTitle(v.name) : t.scheduleTitle}</h3>
            {deadlines && <p className="hint sched-note">{t.myScheduleNote}</p>}
            <ol className="timeline">
              {t.timeline.map((x) => {
                const due = deadlines?.[x.key] ? new Date(deadlines[x.key] + "T00:00:00") : null;
                const done = (x.key === "register" && submitted.profile && submitted.talk) || (x.key === "slides" && finalOpen);
                const days = due ? Math.ceil((due - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000) : null;
                const cls = done ? "done" : days == null ? "" : days < 0 ? "over" : days <= 7 ? "soon" : "later";
                return (
                  <li key={x.title} className={due ? `has-due ${cls}` : ""}>
                    <span className="t-date">{due ? t.fmtDay(due) : x.date}</span>
                    <div>
                      <b>{x.title}</b>
                      {due && <span className={`dday ${cls}`}>{done ? `✓ ${t.dl.done}` : days < 0 ? t.dl.over : t.dl.dday(days)}</span>}
                      <p>{x.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {sessionInfo && <SessionCard t={t} info={sessionInfo} name={v.name} />}

            {invited && <label className="check-row confirm">
              <input id="s-guideRead" type="checkbox" name="guideRead" checked={v.guideRead} onChange={onInput} />
              <span>{t.guideRead}</span>
            </label>}
            {err("guideRead")}
          </>
        )}

        {step === 1 && (
          <>
            <h2>{t.profileTitle}</h2>
            <p className="muted">{t.profileSub}</p>
            <div className="two-col">
              {t.fields.map((f) => (
                <div className={`field ${lang === "en" && f.name === "name" ? "full" : ""}`} key={f.name}>
                  <label htmlFor={`s-${f.name}`}>{f.label}{f.optional && <span className="opt">{t.optional}</span>}</label>
                  <input id={`s-${f.name}`} name={f.name} type={f.type || "text"} placeholder={f.placeholder}
                    autoComplete={f.autoComplete} value={v[f.name]} onChange={onInput} maxLength={100}
                    aria-invalid={!!errors[f.name]} readOnly={invited && f.name === "email"} />
                  {invited && f.name === "email" && <p className="hint">{t.emailLocked}</p>}
                  {err(f.name)}
                </div>
              ))}
            </div>

            <div className="field">
              <label htmlFor="s-photo">{t.photo}</label>
              <div className="photo">
                <div className="thumb">{preview ? <img src={preview} alt="" /> : <span>{t.photoPh}</span>}</div>
                <div>
                  <input id="s-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} aria-invalid={!!errors.photo} />
                  <p className="hint">{t.photoHint}</p>
                </div>
              </div>
              {err("photo")}
            </div>

            <div className="field">
              <label htmlFor="s-bio">{t.bio}</label>
              <textarea id="s-bio" name="bio" rows={5} value={v.bio} onChange={onInput} maxLength={800}
                placeholder={t.bioPh} aria-invalid={!!errors.bio} />
              <p className="hint">{t.bioHint(v.bio.length)}</p>
              {err("bio")}
            </div>

            <div className="consent">
              <p className="consent-text">
                <b>{t.consentTitle}</b><br />
                {t.consentBody.map((line) => <span key={line}>{line}<br /></span>)}
              </p>
              <label className="check-row">
                <input id="s-consentPrivacy" type="checkbox" name="consentPrivacy" checked={v.consentPrivacy} onChange={onInput} />
                <span>{t.consentAgree}</span>
              </label>
              {err("consentPrivacy")}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t.talkTitle}</h2>
            <p className="muted">{t.talkSub}</p>

            {sessionInfo && (
              <div className="session-mini">
                <span>{t.si.forum}</span><b>{sessionInfo.forum}</b>
                <span>{t.si.when}</span><b>{sessionInfo.when}</b>
              </div>
            )}

            <div className="field">
              <label htmlFor="s-title">{t.talkName}</label>
              <input id="s-title" name="title" type="text" value={v.title} onChange={onInput} maxLength={120}
                placeholder={t.talkNamePh} aria-invalid={!!errors.title} />
              {err("title")}
            </div>

            <div className="field">
              <label htmlFor="s-summary">{t.summary}</label>
              <textarea id="s-summary" name="summary" rows={4} value={v.summary} onChange={onInput} maxLength={600}
                placeholder={t.summaryPh} aria-invalid={!!errors.summary} />
              <p className="hint">{t.summaryHint(v.summary.length)}</p>
              {err("summary")}
            </div>

            <div className="field">
              <label htmlFor="s-material">{t.material} <span className="opt">{t.materialOpt}</span></label>
              <label className={`dropzone ${v.material ? "has" : ""}`} htmlFor="s-material">
                <input id="s-material" type="file" accept=".pdf,.ppt,.pptx"
                  onChange={(e) => set("material", e.target.files?.[0] || null)} />
                {v.material ? (
                  <span><b>{v.material.name}</b><br /><span className="hint">{v.material instanceof File ? `${(v.material.size / 1024 / 1024).toFixed(1)}MB · ` : ""}{t.materialChange}</span></span>
                ) : (
                  <span>{t.materialPick}<br /><span className="hint">{t.materialHint}</span></span>
                )}
              </label>
              {err("material")}
            </div>

            <fieldset className="field">
              <legend>{t.recording}</legend>
              <div className="radios">
                <label><input type="radio" name="recording" value="yes" checked={v.recording === "yes"} onChange={onInput} /> {t.yes}</label>
                <label><input type="radio" name="recording" value="no" checked={v.recording === "no"} onChange={onInput} /> {t.no}</label>
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="s-request">{t.request} <span className="opt">{t.optional}</span></label>
              <textarea id="s-request" name="request" rows={2} value={v.request} onChange={onInput} maxLength={400}
                placeholder={t.requestPh} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>{t.statusTitle}</h2>
            {submitted.profile && submitted.talk && !dirty.profile && !dirty.talk
              ? <p className="all-done">{t.allDone}</p>
              : <p className="muted">{t.statusSub}</p>}

            <div className="review">
              <div className="review-head">
                <h3>{t.profileTitle} <Badge t={t} at={submitted.profile} dirty={dirty.profile} /></h3>
                <button type="button" className="link" onClick={() => go(1)}>{submitted.profile ? t.edit : t.write}</button>
              </div>
              {submitted.profile || dirty.profile ? (
                <>
                  <div className="review-profile">
                    <div className="thumb small">{preview ? <img src={preview} alt="" /> : <span>{t.photoPh}</span>}</div>
                    <dl>
                      <dt>{t.rv.name}</dt><dd>{v.name}{v.nameEn && ` (${v.nameEn})`}</dd>
                      <dt>{t.rv.org}</dt><dd>{v.organization} · {v.position}</dd>
                      <dt>{t.rv.email}</dt><dd>{v.email}</dd>
                      <dt>{t.rv.phone}</dt><dd>{v.phone}</dd>
                    </dl>
                  </div>
                  {v.bio && <p className="review-bio">{v.bio}</p>}
                </>
              ) : <p className="empty">{t.empty}</p>}
            </div>

            <div className="review">
              <div className="review-head">
                <h3>{t.talkTitle} <Badge t={t} at={submitted.talk} dirty={dirty.talk} /></h3>
                <button type="button" className="link" onClick={() => go(2)}>{submitted.talk ? t.edit : t.write}</button>
              </div>
              {submitted.talk || dirty.talk ? (
                <dl>
                  <dt>{t.rv.session}</dt><dd>{v.session || "-"}</dd>
                  <dt>{t.rv.title}</dt><dd>{v.title || "-"}</dd>
                  <dt>{t.rv.summary}</dt><dd className="pre">{v.summary || "-"}</dd>
                  <dt>{t.rv.material}</dt><dd>{v.material ? v.material.name : t.rv.later}</dd>
                  <dt>{t.rv.recording}</dt><dd>{v.recording === "yes" ? t.yes : t.no}</dd>
                  {v.request && <><dt>{t.rv.request}</dt><dd className="pre">{v.request}</dd></>}
                </dl>
              ) : <p className="empty">{t.empty}</p>}
            </div>
          </>
        )}

        {step === 4 && finalOpen && (
          <>
            <div className="fi-head">
              <div>
                <h2>{F.title}</h2>
                <p className="muted">{F.updated}</p>
              </div>
              <span className="badge done big">{F.confirmed}</span>
            </div>

            <div className="fi-hero">
              <div className="fi-hero-main">
                <p className="fi-label">{F.myTalk(v.name)}</p>
                <p className="fi-time">{sessionInfo?.when}</p>
                <p className="fi-title">{v.title}</p>
                <div className="fi-chips"><span>{sessionInfo?.forum}</span></div>
              </div>
              <div className="fi-hero-side">
                <p className="fi-label">{F.arrive}</p>
                <p className="fi-big">{F.arriveTime}</p>
                <p className="hint">{F.arriveHint}</p>
              </div>
            </div>

            <div className="fi-grid">
              <div className="fi-card">
                <h3>{F.onsite}</h3>
                <dl className="fi-dl">
                  <dt>{F.venue}</dt><dd>{F.venueV}</dd>
                  <dt>{F.room}</dt><dd>{F.roomV}</dd>
                  <dt>{F.desk}</dt><dd>{F.deskV}</dd>
                </dl>
                <p className="hint">{F.onsiteHint}</p>
              </div>
              <div className="fi-card">
                <h3>{F.order}</h3>
                <ol className="fi-order">
                  {F.orderRows.map(([time, what, me]) => <li key={time} className={me ? "me" : ""}><span>{time}</span>{what}</li>)}
                </ol>
              </div>
            </div>

            <div className="fi-card">
              <h3>{F.todo}</h3>
              <ul className="todo">
                {F.todos.map(([st, what, when]) => (
                  <li key={what} className={st}><span>{st === "ok" ? "✓" : st === "due" ? "!" : "○"}</span>{what}<em>{when}</em></li>
                ))}
              </ul>
            </div>

            <div className="fi-note">
              <p className="fi-label">{F.memo}</p>
              <p>{F.memoBody}</p>
              <p className="fi-sign">{F.memoSign}</p>
            </div>
          </>
        )}
      </div>

      {serverMessage && <p className="banner server-msg" role="alert">{serverMessage}</p>}

      <div className="wizard-nav">
        {step > 0 ? <button type="button" className="btn ghost" onClick={() => go(step - 1)}>{t.prev}</button> : <span />}
        {step === 0 && invited && <button type="button" className="btn primary" onClick={start}>{started ? t.next : t.start}</button>}
        {(step === 1 || step === 2) && (
          justSaved === SECTION_OF_STEP[step] ? (
            <button type="button" className="btn primary" onClick={() => go(step + 1)}>{step === 1 ? t.goTalk : t.goStatus}</button>
          ) : (
            <button type="button" className="btn primary" onClick={saveSection} disabled={sending}>
              {sending ? t.sending : submitted[SECTION_OF_STEP[step]] ? `${step === 1 ? t.submitProfile : t.submitTalk} · ${t.resubmit}` : step === 1 ? t.submitProfile : t.submitTalk}
            </button>
          )
        )}
        {step === 3 && finalOpen && <button type="button" className="btn primary" onClick={() => go(4)}>{F.title}</button>}
      </div>
    </section>
  );
}

function Badge({ t, at, dirty }) {
  if (dirty) return <span className="badge draft">{at ? t.badge.editing : t.badge.draft}</span>;
  if (at) return <span className="badge done">{t.badge.done} · {t.fmt(at)}</span>;
  return <span className="badge todo">{t.badge.todo}</span>;
}

// 연사별 세션 정보 (담당자가 시트에 연사마다 넣는 내용)
function SessionCard({ t, info, name }) {
  return (
    <section className="session-card">
      <div className="session-card-head">
        <h3>{t.sessionTitle}</h3>
        <p>{t.sessionSub(name)}</p>
      </div>
      <dl className="session-dl">
        <dt>{t.si.forum}</dt><dd><b>{info.forum}</b></dd>
        <dt>{t.si.topic}</dt><dd>{info.topic}</dd>
        <dt>{t.si.when}</dt><dd>{info.when}</dd>
        <dt>{t.si.agenda}</dt><dd className="agenda">“{info.agenda}”</dd>
      </dl>
      {info.include?.length > 0 && (
        <div className="session-include">
          <p>{t.si.include}</p>
          <ul>{info.include.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
