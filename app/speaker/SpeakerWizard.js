"use client";

import { useEffect, useRef, useState } from "react";
import { TEXT, DEMO_SPEAKER, DEMO_TODAY } from "@/lib/speakerI18n";

// 탭 순서 (t.steps 순서와 같아요)
const ALL_TABS = ["profile", "travel", "fee", "talk", "final"];
const FORM_TABS = ["profile", "travel", "fee", "talk"];
const KEYS = {
  profile: ["name", "nameEn", "email", "phone", "organization", "position", "bio", "photo", "consentPrivacy"],
  travel: ["flight", "from", "arrive", "depart", "flightNo", "passport", "hotel", "checkin", "checkout", "room", "diet", "travelNote"],
  fee: ["bank", "swift", "account", "holder", "bankAddr", "idCopy", "bankCopy", "feeConsent"],
  talk: ["title", "summary", "material", "recording", "request"],
};
// 일정 안내 줄 ↔ 탭
const TIMELINE_TAB = { register: "profile", travel: "travel", fee: "fee", slides: "talk" };

// 디자인 미리보기 (?demo=…, 언어는 ?lang=en)
//  link   : 개인 링크로 처음 들어온 연사 (8월 전: 연사료·최종 안내 숨김)
//  return : 기본정보만 제출하고 다시 들어온 연사
//  final  : 8월 이후, 모두 제출했고 최종 안내가 열린 연사
//  &fee=n : 연사료 대상이 아닌 연사,  &open=aug : 8월 이후 상태

function parseAt(s) {
  const m = String(s || "").match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

function validate(tab, v, t, lang) {
  const e = {};
  const E = t.err;
  if (tab === "profile") {
    if (!v.name.trim()) e.name = E.name;
    if (!EMAIL_RE.test(v.email.trim())) e.email = E.email;
    if (!PHONE_RE.test(v.phone.trim())) e.phone = E.phone;
    if (!v.organization.trim()) e.organization = E.organization;
    if (!v.position.trim()) e.position = E.position;
    if (!v.photo) e.photo = E.photo;
    if (v.bio.trim().length < 20) e.bio = E.bio;
    if (!v.consentPrivacy) e.consentPrivacy = E.consentPrivacy;
  }
  if (tab === "travel") {
    if (!v.flight) e.flight = E.flight;
    if (v.flight && v.flight !== "none") {
      if (!v.from.trim()) e.from = E.from;
      if (!v.arrive) e.arrive = E.arrive;
      if (!v.depart) e.depart = E.depart;
    }
    if (!v.hotel) e.hotel = E.hotel;
    if (v.hotel === "need" && (!v.checkin || !v.checkout)) e.checkin = E.checkin;
  }
  if (tab === "fee") {
    if (!v.bank.trim()) e.bank = E.bank;
    if (lang === "en" && !v.swift.trim()) e.swift = E.swift;
    if (!v.account.trim()) e.account = E.account;
    if (!v.holder.trim()) e.holder = E.holder;
    if (!v.idCopy) e.idCopy = E.idCopy;
    if (!v.feeConsent) e.feeConsent = E.feeConsent;
  }
  if (tab === "talk") {
    if (!v.title.trim()) e.title = E.title;
    if (v.summary.trim().length < 20) e.summary = E.summary;
  }
  return e;
}

const EMPTY_SUB = { profile: null, travel: null, fee: null, talk: null };
const NO_DIRTY = { profile: false, travel: false, fee: false, talk: false };

export default function SpeakerWizard({ lang = "ko" }) {
  const t = TEXT[lang];
  const [tab, setTab] = useState("profile");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState(EMPTY_SUB); // 탭별 제출 시각
  const [dirty, setDirty] = useState(NO_DIRTY); // 제출 뒤 고친 내용이 있는지
  const [justSaved, setJustSaved] = useState(null);
  const [returning, setReturning] = useState(false);
  const [invited, setInvited] = useState(false); // 개인 링크로 들어왔는지
  // 탭 노출: 시트 "탭 공개" 표(전체) + 연사별 칸(언어, 연사료 대상)
  const [openTabs, setOpenTabs] = useState({ profile: true, travel: true, fee: false, talk: true, final: false });
  const [feeEligible, setFeeEligible] = useState(true);
  const [sessionInfo, setSessionInfo] = useState(null); // 담당자가 연사별로 넣는 세션 정보
  const [deadlines, setDeadlines] = useState(null); // 연사별 마감일 (YYYY-MM-DD)
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
    name: "", nameEn: "", email: "", phone: "", organization: "", position: "", bio: "", photo: null, consentPrivacy: false,
    flight: "", from: "", arrive: "", depart: "", flightNo: "", passport: "", hotel: "", checkin: "", checkout: "", room: "", diet: "", travelNote: "",
    bank: "", swift: "", account: "", holder: "", bankAddr: "", idCopy: null, bankCopy: null, feeConsent: false,
    title: "", summary: "", material: null, recording: "yes", request: "",
  });

  useEffect(() => () => preview && preview.startsWith("blob:") && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    const tk = params.get("t");
    if (tk) { loadSpeaker(tk); return; }
    if (!demo) return;
    const d = DEMO_SPEAKER[lang];
    const aug = demo === "final" || params.get("open") === "aug";
    setDemoMode(true);
    setInvited(true);
    setSessionInfo(d.session);
    setDeadlines(d.deadlines);
    setToday(new Date((aug ? "2027-08-20" : DEMO_TODAY) + "T09:00:00"));
    setFeeEligible(params.get("fee") !== "n");
    setOpenTabs((o) => ({ ...o, fee: aug, final: aug }));
    if (demo === "link") setV((s) => ({ ...s, name: d.name, email: d.email }));
    if (demo === "return" || demo === "final") {
      setV((s) => ({ ...s, ...d, photo: { name: "profile.jpg" }, consentPrivacy: true }));
      setSubmitted({ ...EMPTY_SUB, profile: new Date(2027, 6, 2, 13, 40) });
      setReturning(true);
      setTab(lang === "en" ? "travel" : "talk");
    }
    if (demo === "final") {
      setV((s) => ({
        ...s,
        flight: "office", from: lang === "en" ? "Boston (BOS)" : "", arrive: "2027-08-31", depart: "2027-09-04", passport: lang === "en" ? "SMITH JANE" : "",
        hotel: "need", checkin: "2027-08-31", checkout: "2027-09-04", room: lang === "en" ? "Single" : "싱글",
        bank: lang === "en" ? "Bank of America" : "국민은행", swift: "BOFAUS3N", account: "000123456789", holder: d.name, idCopy: { name: lang === "en" ? "passport.pdf" : "id.pdf" }, feeConsent: true,
        title: d.session.agenda,
        summary: lang === "en" ? "Progress and outcomes of MFDS NAMs R&D, and our strategy for K-DDT, AI-based evaluation platforms and global regulatory collaboration." : "식약처 NAMs R&D 추진현황과 성과, K-DDT 구축·AI 기반 평가 플랫폼·글로벌 규제기관 협력 등 향후 추진전략을 소개합니다.",
        material: { name: "slides.pptx" },
      }));
      setSubmitted({ profile: new Date(2027, 6, 2, 13, 40), travel: new Date(2027, 6, 6, 10, 5), fee: new Date(2027, 7, 3, 11, 20), talk: new Date(2027, 7, 9, 18, 2) });
      setTab("final");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 개인 링크(?t=…)로 들어오면 시트에 저장된 내용을 불러옵니다. (지금은 기본정보·발표자료만 연결)
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
        title: sp.title, summary: sp.summary,
        material: sp.materialUrl ? { name: "slides", url: sp.materialUrl } : null,
        recording: sp.recording === "동의하지 않음" ? "no" : "yes", request: sp.request,
      }));
      if (sp.photoUrl) setPreview(sp.photoUrl);
      const sub = { ...EMPTY_SUB, profile: parseAt(sp.profileAt), talk: parseAt(sp.talkAt) };
      setSubmitted(sub);
      if (sub.profile || sub.talk) {
        setReturning(true);
        setTab(!sub.profile ? "profile" : "talk");
      }
    } catch {
      setLinkError(t.linkErrorTitle);
    } finally {
      setLoading(false);
    }
  }

  // 이 연사에게 보이는 탭
  const showTab = (k) => openTabs[k] && (k !== "travel" || lang === "en") && (k !== "fee" || feeEligible);
  const tabs = ALL_TABS.filter(showTab);
  const formTabs = FORM_TABS.filter(showTab);
  const doneCount = formTabs.filter((k) => submitted[k] && !dirty[k]).length;
  const allDone = doneCount === formTabs.length;
  const label = (k) => t.steps[ALL_TABS.indexOf(k)];

  // 미리보기 설정에서 탭이 숨겨지면 보이는 탭으로 옮겨요.
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tab, tabs]);

  function set(name, value) {
    setV((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    const sec = FORM_TABS.find((k) => KEYS[k].includes(name));
    if (sec) { setDirty((d) => ({ ...d, [sec]: true })); setJustSaved(null); }
  }
  const onInput = (e) => set(e.target.name, e.target.type === "checkbox" ? e.target.checked : e.target.value);

  function go(next) {
    setTab(next);
    setErrors({});
    setJustSaved(null);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function markSaved(sec, at) {
    setSubmitted((s) => ({ ...s, [sec]: at }));
    setDirty((d) => ({ ...d, [sec]: false }));
    setJustSaved(sec);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveSection() {
    setServerMessage("");
    const e = validate(tab, v, t, lang);
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById(`s-${Object.keys(e)[0]}`)?.focus(); return; }
    const sec = tab;
    setSending(true);
    if (!token || sec === "travel" || sec === "fee") {
      // 디자인 미리보기: 실제 저장 없이 저장된 것처럼 보여줍니다. (항공·숙박·연사료는 아직 미연결)
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
      for (const k of ["title", "summary", "recording", "request"]) fd.set(k, v[k] || "");
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

  function stateOf(k) {
    if (k === "final") return "final";
    if (submitted[k] && !dirty[k]) return "done";
    if (dirty[k]) return "draft";
    return "todo";
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
  const F = t.final;
  const T = t.travel;
  const P = t.fee;
  const idx = tabs.indexOf(tab);
  const nextTab = tabs[idx + 1];
  const hidden = ALL_TABS.filter((k) => !showTab(k)).map((k) => label(k)[0]);
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const textField = (name, lbl, ph, opt, type = "text") => (
    <div className="field" key={name}>
      <label htmlFor={`s-${name}`}>{lbl}{opt && <span className="opt">{t.optional}</span>}</label>
      <input id={`s-${name}`} name={name} type={type} placeholder={ph} value={v[name]} onChange={onInput} maxLength={120} aria-invalid={!!errors[name]} />
      {err(name)}
    </div>
  );
  const radios = (name, lbl, opts) => (
    <fieldset className="field">
      <legend>{lbl}</legend>
      <div className="radios stack">
        {opts.map(([val, txt]) => (
          <label key={val}><input id={opts[0][0] === val ? `s-${name}` : undefined} type="radio" name={name} value={val} checked={v[name] === val} onChange={onInput} /> {txt}</label>
        ))}
      </div>
      {err(name)}
    </fieldset>
  );
  const upload = (name, lbl, opt) => (
    <div className="field">
      <label htmlFor={`s-${name}`}>{lbl}{opt && <span className="opt">{t.optional}</span>}</label>
      <label className={`dropzone small ${v[name] ? "has" : ""}`} htmlFor={`s-${name}`}>
        <input id={`s-${name}`} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => set(name, e.target.files?.[0] || null)} />
        {v[name] ? <span><b>{v[name].name}</b> <span className="hint">· {t.materialChange}</span></span> : <span><b>{P.upPick}</b> <span className="hint">· {P.upHint}</span></span>}
      </label>
      {err(name)}
    </div>
  );

  return (
    <section className="card wizard" ref={topRef}>
      {demoMode && (
        <div className="demo-bar">
          <p className="preview-badge">{t.previewBadge}</p>
          <div className="demo-ctl">
            <b>{t.demoBar.title}</b>
            <label><input type="checkbox" checked={feeEligible} onChange={(e) => setFeeEligible(e.target.checked)} /> {t.demoBar.fee}</label>
            <label><input type="checkbox" checked={openTabs.final} onChange={(e) => { const on = e.target.checked; setOpenTabs((o) => ({ ...o, fee: on, final: on })); setToday(new Date((on ? "2027-08-20" : DEMO_TODAY) + "T09:00:00")); }} /> {t.demoBar.open}</label>
            <span className="hint">{hidden.length ? t.hiddenNote(hidden.join(", ")) + " · " : ""}{t.demoBar.hint}</span>
          </div>
        </div>
      )}

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
        <div className={`welcome ${openTabs.final ? "final" : ""}`} role="status">
          {openTabs.final ? t.welcomeFinal(v.name) : returning ? t.welcomeBack(v.name) : t.welcome(v.name)}
        </div>
      )}

      {/* 연사 안내: 일정 + 세션 정보 (처음 들어오면 펼쳐져 있어요) */}
      {invited && (
        <details className="guide-panel" open={!returning}>
          <summary>{t.guideToggle}</summary>
          <div className="guide-body">
            <h3 className="sub">{deadlines ? t.myScheduleTitle(v.name) : t.scheduleTitle}</h3>
            {deadlines && <p className="hint sched-note">{t.myScheduleNote}</p>}
            <ol className="timeline">
              {t.timeline.filter((x) => !TIMELINE_TAB[x.key] || showTab(TIMELINE_TAB[x.key])).map((x) => {
                const due = deadlines?.[x.key] ? new Date(deadlines[x.key] + "T00:00:00") : null;
                const k = TIMELINE_TAB[x.key];
                const done = k && submitted[k] && !dirty[k];
                const days = due ? Math.ceil((due - today0) / 86400000) : null;
                const cls = done ? "done" : days == null ? "" : days < 0 ? "over" : days <= 7 ? "soon" : "later";
                return (
                  <li key={x.key} className={due ? `has-due ${cls}` : ""}>
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
          </div>
        </details>
      )}

      <div className="tab-head">
        <ol className="steps" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((k, i) => {
            const st = stateOf(k);
            const [long, short] = label(k);
            const note = st === "final" ? t.note.new : st === "done" ? t.note.done : st === "draft" ? (submitted[k] ? t.note.editing : t.note.draft) : t.note.todo;
            return (
              <li key={k} className={`step ${st} ${k === tab ? "current" : ""} ${!invited ? "locked" : ""}`}>
                <button type="button" role="tab" aria-selected={k === tab} disabled={!invited} onClick={() => go(k)}>
                  <span className="num">{st === "final" ? "★" : st === "done" ? "✓" : st === "draft" ? "✎" : i + 1}</span>
                  <span className="lbl">
                    <span className="lbl-long">{long}</span><span className="lbl-short">{short}</span>
                    <span className={`state-note ${st}`}>{note}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {invited && <p className={`progress-text ${allDone ? "done" : ""}`}>{t.progress(doneCount, formTabs.length)}</p>}
      </div>

      {justSaved ? (
        <div className="saved" role="status"><b>{t.savedSec(t.secName[justSaved])}</b>{allDone ? "" : t.savedNext}</div>
      ) : allDone && invited && tab !== "final" ? (
        <div className="saved" role="status"><b>{t.allDoneBanner}</b></div>
      ) : null}

      <div className="panel" role="tabpanel">
        {tab === "profile" && (
          <>
            <div className="panel-head"><h2>{t.profileTitle}</h2><Badge t={t} at={submitted.profile} dirty={dirty.profile} /></div>
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
                  <p className="hint">{v.photo && !(v.photo instanceof File) ? `${v.photo.name} · ` : ""}{t.photoHint}</p>
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

        {tab === "travel" && (
          <>
            <div className="panel-head"><h2>{T.title}</h2><Badge t={t} at={submitted.travel} dirty={dirty.travel} /></div>
            <p className="muted">{T.sub}</p>

            {radios("flight", `✈ ${T.flight}`, T.flightOpts)}
            {v.flight && v.flight !== "none" && (
              <div className="two-col">
                {textField("from", T.from, T.fromPh)}
                {textField("passport", T.passport, T.passportPh, lang === "ko")}
                {textField("arrive", T.arrive, "", false, "date")}
                {textField("depart", T.depart, "", false, "date")}
                {v.flight === "self" && <div className="full">{textField("flightNo", T.flightNo, T.flightNoPh, true)}</div>}
              </div>
            )}

            {radios("hotel", `🏨 ${T.hotel}`, T.hotelOpts)}
            {v.hotel === "need" && (
              <div className="two-col three">
                {textField("checkin", T.checkin, "", false, "date")}
                {textField("checkout", T.checkout, "", false, "date")}
                <div className="field">
                  <label htmlFor="s-room">{T.room}</label>
                  <select id="s-room" name="room" value={v.room} onChange={onInput}>
                    <option value="">-</option>
                    {T.roomOpts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}

            {textField("diet", T.diet, T.dietPh, true)}
            <div className="field">
              <label htmlFor="s-travelNote">{T.note}<span className="opt">{t.optional}</span></label>
              <textarea id="s-travelNote" name="travelNote" rows={2} value={v.travelNote} onChange={onInput} maxLength={400} placeholder={T.notePh} />
            </div>
          </>
        )}

        {tab === "fee" && (
          <>
            <div className="panel-head"><h2>{P.title}</h2><Badge t={t} at={submitted.fee} dirty={dirty.fee} /></div>
            <p className="muted">{P.sub}</p>
            <p className="notice">{P.notice}</p>
            <div className="two-col">
              {textField("bank", P.bank, P.bankPh)}
              {lang === "en" && textField("swift", P.swift, P.swiftPh)}
              {textField("account", P.account, P.accountPh)}
              {textField("holder", P.holder, P.holderPh)}
              {lang === "en" && <div className="full">{textField("bankAddr", P.bankAddr, P.bankAddrPh, true)}</div>}
            </div>
            <div className="two-col">
              {upload("idCopy", P.idCopy)}
              {upload("bankCopy", P.bankCopy, lang === "ko")}
            </div>
            <label className="check-row confirm">
              <input id="s-feeConsent" type="checkbox" name="feeConsent" checked={v.feeConsent} onChange={onInput} />
              <span>{P.consent}</span>
            </label>
            {err("feeConsent")}
          </>
        )}

        {tab === "talk" && (
          <>
            <div className="panel-head"><h2>{t.talkTitle}</h2><Badge t={t} at={submitted.talk} dirty={dirty.talk} /></div>
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

        {tab === "final" && (
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
                <p className="fi-title">{v.title || sessionInfo?.agenda}</p>
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
                {F.todos.filter(([, what]) => (lang === "en" || !/항공|Flight/.test(what)) && (feeEligible || !/연사료|Honorarium/.test(what))).map(([st, what, when]) => (
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

      {invited && (
        <div className="wizard-nav">
          {idx > 0 ? <button type="button" className="btn ghost" onClick={() => go(tabs[idx - 1])}>{t.prev}</button> : <span />}
          {tab !== "final" && (
            justSaved === tab ? (
              nextTab ? <button type="button" className="btn primary" onClick={() => go(nextTab)}>{t.nextTab} · {label(nextTab)[0]}</button> : <span />
            ) : (
              <button type="button" className="btn primary" onClick={saveSection} disabled={sending}>
                {sending ? t.sending : `${t.submitSec(t.secName[tab])}${submitted[tab] ? ` · ${t.resubmit}` : ""}`}
              </button>
            )
          )}
        </div>
      )}
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
