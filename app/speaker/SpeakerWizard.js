"use client";

import { useEffect, useRef, useState } from "react";
import { SPEAKER } from "@/lib/event";

const STEPS = [
  { key: "guide", label: "연사 안내", short: "안내" },
  { key: "profile", label: "기본 정보", short: "기본정보" },
  { key: "talk", label: "발표 정보", short: "발표정보" },
  { key: "status", label: "제출 현황", short: "현황" },
];
const SECTION_OF_STEP = { 1: "profile", 2: "talk" };
const PROFILE_KEYS = ["name", "nameEn", "email", "phone", "organization", "position", "bio", "photo", "consentPrivacy"];
const TALK_KEYS = ["session", "title", "summary", "material", "rehearsal", "recording", "request"];

// 디자인 미리보기용
//  ?demo=link   : 개인 링크로 처음 들어온 연사 (명단의 이름·이메일이 채워져 있음)
//  ?demo=return : 기본정보만 제출하고 다시 들어온 연사
const DEMO_RETURN = {
  name: "김연사", nameEn: "Yeonsa Kim", email: "speaker@example.com", phone: "010-1234-5678",
  organization: "○○제약", position: "품질보증팀 / 팀장", photo: { name: "profile.jpg" },
  bio: "현) ○○제약 품질보증팀 팀장\n전) ○○바이오 QA 매니저\nICH Q9(R1) 실무 적용 자문", consentPrivacy: true,
};

function fmt(d) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

const PROFILE_FIELDS = [
  { name: "name", label: "이름", placeholder: "홍길동", autoComplete: "name" },
  { name: "nameEn", label: "영문 이름", placeholder: "Gildong Hong", optional: true },
  { name: "email", label: "이메일", type: "email", placeholder: "name@company.com", autoComplete: "email" },
  { name: "phone", label: "연락처", type: "tel", placeholder: "010-1234-5678", autoComplete: "tel" },
  { name: "organization", label: "소속 (회사·기관)", placeholder: "○○제약", autoComplete: "organization" },
  { name: "position", label: "부서·직책", placeholder: "품질보증팀 / 팀장", autoComplete: "organization-title" },
];

function validate(step, v) {
  const e = {};
  if (step === 0 && !v.guideRead) e.guideRead = "안내 내용을 확인했다고 체크해 주세요.";
  if (step === 1) {
    if (!v.name.trim()) e.name = "이름을 입력해 주세요.";
    if (!EMAIL_RE.test(v.email.trim())) e.email = "올바른 이메일 주소를 입력해 주세요.";
    if (!PHONE_RE.test(v.phone.trim())) e.phone = "연락처를 확인해 주세요. (예: 010-1234-5678)";
    if (!v.organization.trim()) e.organization = "소속을 입력해 주세요.";
    if (!v.position.trim()) e.position = "부서·직책을 입력해 주세요.";
    if (!v.photo) e.photo = "프로필 사진을 첨부해 주세요.";
    if (v.bio.trim().length < 20) e.bio = "약력을 20자 이상 적어 주세요.";
    if (!v.consentPrivacy) e.consentPrivacy = "개인정보 수집·이용에 동의해 주세요.";
  }
  if (step === 2) {
    if (!v.session) e.session = "발표 세션을 골라 주세요.";
    if (!v.title.trim()) e.title = "발표 제목을 입력해 주세요.";
    if (v.summary.trim().length < 20) e.summary = "발표 요약을 20자 이상 적어 주세요.";
    if (!v.rehearsal.length) e.rehearsal = "가능한 리허설 시간을 하나 이상 골라 주세요.";
  }
  return e;
}

export default function SpeakerWizard() {
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState({ profile: null, talk: null }); // 제출 시각
  const [dirty, setDirty] = useState({ profile: false, talk: false }); // 제출 뒤 고친 내용이 있는지
  const [justSaved, setJustSaved] = useState(null); // 방금 저장한 섹션
  const [returning, setReturning] = useState(false);
  const [invited, setInvited] = useState(false); // 개인 링크로 들어왔는지
  const [resendOpen, setResendOpen] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const topRef = useRef(null);
  const [v, setV] = useState({
    guideRead: false,
    name: "", nameEn: "", email: "", phone: "", organization: "", position: "", bio: "", photo: null, consentPrivacy: false,
    session: "", title: "", summary: "", material: null, rehearsal: [], recording: "yes", request: "",
  });

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo === "link") {
      setV((s) => ({ ...s, name: DEMO_RETURN.name, email: DEMO_RETURN.email }));
      setInvited(true);
    }
    if (demo === "return") {
      setInvited(true);
      setV((s) => ({ ...s, ...DEMO_RETURN, guideRead: true }));
      setSubmitted({ profile: new Date(2026, 10, 24, 13, 40), talk: null });
      setStarted(true);
      setReturning(true);
      setStep(2);
    }
  }, []);

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
    const e = validate(step, v);
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

  function saveSection() {
    if (!check()) return;
    const sec = SECTION_OF_STEP[step];
    // 디자인 미리보기: 실제 저장 없이 저장된 것처럼 보여줍니다.
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted((s) => ({ ...s, [sec]: new Date() }));
      setDirty((d) => ({ ...d, [sec]: false }));
      setJustSaved(sec);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  }

  function stateOf(i) {
    if (i === 0) return started ? "done" : step === 0 ? "current" : "todo";
    if (i === 3) return "todo";
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

  const err = (k) => errors[k] && <p className="error" id={`e-${k}`}>{errors[k]}</p>;

  return (
    <section className="card wizard" ref={topRef}>
      <p className="preview-badge">디자인 미리보기 · 아직 실제로 저장되지 않아요</p>

      {!invited && (
        <div className="resume">
          {!resendOpen ? (
            <p>등록은 안내 메일로 받으신 <b>개인 링크</b>로 들어와서 해 주세요. 링크를 못 찾으시면 <button type="button" className="link" onClick={() => setResendOpen(true)}>개인 링크 다시 받기</button></p>
          ) : resendSent ? (
            <p role="status">연사 명단에 있는 주소라면 개인 링크를 다시 보냈어요. 메일함을 확인해 주세요.</p>
          ) : (
            <form className="resume-form" onSubmit={(e) => { e.preventDefault(); setResendSent(true); }}>
              <label htmlFor="s-resendEmail">등록 때 쓴 이메일</label>
              <div>
                <input id="s-resendEmail" type="email" placeholder="name@company.com" required />
                <button type="submit" className="btn ghost">링크 받기</button>
              </div>
            </form>
          )}
        </div>
      )}

      {returning && (
        <div className="welcome" role="status">
          <b>{v.name}님, 다시 오셨네요.</b> 지난번에 제출한 내용을 불러왔어요. 남은 단계만 이어서 작성해 주세요.
        </div>
      )}
      {invited && !returning && (
        <div className="welcome" role="status">
          <b>{v.name}님, 안녕하세요.</b> 안내를 확인하신 뒤 기본정보와 발표정보를 단계별로 제출해 주세요. 나눠서 제출해도 이 링크로 다시 들어오면 이어서 쓸 수 있어요.
        </div>
      )}

      <ol className="steps" role="tablist" aria-label="등록 단계">
        {STEPS.map((s, i) => {
          const st = stateOf(i);
          const locked = i > 0 && (!started || !invited);
          const sec = SECTION_OF_STEP[i];
          const note = st === "done" && sec ? "제출 완료" : st === "draft" ? (submitted[sec] ? "수정 중" : "작성 중") : i > 0 && i < 3 ? "미제출" : "";
          return (
            <li key={s.key} className={`step ${st} ${i === step ? "current" : ""} ${locked ? "locked" : ""}`}>
              <button type="button" role="tab" aria-selected={i === step} disabled={locked} onClick={() => go(i)}>
                <span className="num">{st === "done" ? "✓" : st === "draft" ? "✎" : i + 1}</span>
                <span className="lbl">
                  <span className="lbl-long">{s.label}</span><span className="lbl-short">{s.short}</span>
                  {note && <span className={`state-note ${st}`}>{note}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="progress" aria-hidden><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>

      {justSaved && (
        <div className="saved" role="status">
          <b>✓ {justSaved === "profile" ? "기본정보" : "발표정보"}가 제출되었어요.</b>
          {justSaved === "profile" && !submitted.talk
            ? <> 발표정보는 지금 이어서 쓰셔도 되고, 나중에 같은 개인 링크로 들어와서 쓰셔도 돼요.</>
            : <> 언제든 다시 들어와서 고칠 수 있어요.</>}
        </div>
      )}

      <div className="panel" role="tabpanel">
        {step === 0 && (
          <>
            <h2>연사 안내</h2>
            <p className="muted">등록 전에 일정과 진행 방식을 확인해 주세요.</p>

            <h3 className="sub">주요 일정</h3>
            <ol className="timeline">
              {SPEAKER.timeline.map((t) => (
                <li key={t.title}>
                  <span className="t-date">{t.date}</span>
                  <div><b>{t.title}</b><p>{t.desc}</p></div>
                </li>
              ))}
            </ol>

            <h3 className="sub">진행 안내</h3>
            <div className="guide-grid">
              {SPEAKER.guide.map((g) => (
                <div className="guide-item" key={g.title}><b>{g.title}</b><p>{g.body}</p></div>
              ))}
            </div>

            {invited && <label className="check-row confirm">
              <input id="s-guideRead" type="checkbox" name="guideRead" checked={v.guideRead} onChange={onInput} />
              <span>위 안내를 확인했습니다.</span>
            </label>}
            {err("guideRead")}
          </>
        )}

        {step === 1 && (
          <>
            <h2>기본 정보</h2>
            <p className="muted">프로그램 안내와 연사 소개에 쓰입니다.</p>
            <div className="two-col">
              {PROFILE_FIELDS.map((f) => (
                <div className="field" key={f.name}>
                  <label htmlFor={`s-${f.name}`}>{f.label}{f.optional && <span className="opt"> (선택)</span>}</label>
                  <input id={`s-${f.name}`} name={f.name} type={f.type || "text"} placeholder={f.placeholder}
                    autoComplete={f.autoComplete} value={v[f.name]} onChange={onInput} maxLength={100}
                    aria-invalid={!!errors[f.name]} readOnly={invited && f.name === "email"} />
                  {invited && f.name === "email" && <p className="hint">명단에 등록된 주소예요. 바꾸려면 담당자에게 알려 주세요.</p>}
                  {err(f.name)}
                </div>
              ))}
            </div>

            <div className="field">
              <label htmlFor="s-photo">프로필 사진</label>
              <div className="photo">
                <div className="thumb">{preview ? <img src={preview} alt="프로필 사진 미리보기" /> : <span>사진</span>}</div>
                <div>
                  <input id="s-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} aria-invalid={!!errors.photo} />
                  <p className="hint">정면 상반신 사진 권장. JPG·PNG·WEBP, 4MB 이하.</p>
                </div>
              </div>
              {err("photo")}
            </div>

            <div className="field">
              <label htmlFor="s-bio">약력</label>
              <textarea id="s-bio" name="bio" rows={5} value={v.bio} onChange={onInput} maxLength={800}
                placeholder={"예) 현) ○○제약 품질보증팀 팀장\n전) 식품의약품안전처 ○○과\nICH Q9(R1) 실무 적용 자문"} aria-invalid={!!errors.bio} />
              <p className="hint">{v.bio.length} / 800자 · 줄마다 한 항목씩 적어 주세요.</p>
              {err("bio")}
            </div>

            <div className="consent">
              <p className="consent-text">
                <b>개인정보 수집·이용 안내</b><br />
                수집 항목: 이름, 영문 이름, 이메일, 연락처, 소속, 직책, 사진, 약력, 발표 정보<br />
                이용 목적: 연사 섭외·일정 안내, 교육 프로그램 및 연사 소개 게시<br />
                보유 기간: 교육 종료 후 1년 (이후 파기)
              </p>
              <label className="check-row">
                <input id="s-consentPrivacy" type="checkbox" name="consentPrivacy" checked={v.consentPrivacy} onChange={onInput} />
                <span>위 내용에 동의합니다. (필수)</span>
              </label>
              {err("consentPrivacy")}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>발표 정보</h2>
            <p className="muted">발표 세션과 자료, 리허설 가능 시간을 알려 주세요.</p>

            <div className="field">
              <label htmlFor="s-session">발표 세션</label>
              <select id="s-session" name="session" value={v.session} onChange={onInput} aria-invalid={!!errors.session}>
                <option value="">세션을 골라 주세요</option>
                {SPEAKER.sessions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {err("session")}
            </div>

            <div className="field">
              <label htmlFor="s-title">발표 제목</label>
              <input id="s-title" name="title" type="text" value={v.title} onChange={onInput} maxLength={120}
                placeholder="ICH Q9(R1) 품질위험관리 실무 적용 사례" aria-invalid={!!errors.title} />
              {err("title")}
            </div>

            <div className="field">
              <label htmlFor="s-summary">발표 요약</label>
              <textarea id="s-summary" name="summary" rows={4} value={v.summary} onChange={onInput} maxLength={600}
                placeholder="참석자에게 안내될 3~5줄 요약" aria-invalid={!!errors.summary} />
              <p className="hint">{v.summary.length} / 600자</p>
              {err("summary")}
            </div>

            <div className="field">
              <label htmlFor="s-material">발표자료 <span className="opt">(선택 · 초안도 괜찮아요)</span></label>
              <label className={`dropzone ${v.material ? "has" : ""}`} htmlFor="s-material">
                <input id="s-material" type="file" accept=".pdf,.ppt,.pptx"
                  onChange={(e) => set("material", e.target.files?.[0] || null)} />
                {v.material ? (
                  <span><b>{v.material.name}</b><br /><span className="hint">{(v.material.size / 1024 / 1024).toFixed(1)}MB · 눌러서 바꾸기</span></span>
                ) : (
                  <span><b>파일 선택</b> 또는 여기로 끌어다 놓기<br /><span className="hint">PDF·PPT·PPTX · 최종본은 {SPEAKER.materialDeadline}까지</span></span>
                )}
              </label>
            </div>

            <fieldset className="field">
              <legend>리허설 가능 시간 <span className="opt">(여러 개 선택 가능)</span></legend>
              <div className="chips" id="s-rehearsal" tabIndex={-1}>
                {SPEAKER.rehearsalOptions.map((o) => (
                  <label key={o} className={`chip ${v.rehearsal.includes(o) ? "on" : ""}`}>
                    <input type="checkbox" checked={v.rehearsal.includes(o)} onChange={() => toggleRehearsal(o)} />
                    {o}
                  </label>
                ))}
              </div>
              {err("rehearsal")}
            </fieldset>

            <fieldset className="field">
              <legend>발표 녹화·다시보기 제공</legend>
              <div className="radios">
                <label><input type="radio" name="recording" value="yes" checked={v.recording === "yes"} onChange={onInput} /> 동의</label>
                <label><input type="radio" name="recording" value="no" checked={v.recording === "no"} onChange={onInput} /> 동의하지 않음</label>
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="s-request">요청 사항 <span className="opt">(선택)</span></label>
              <textarea id="s-request" name="request" rows={2} value={v.request} onChange={onInput} maxLength={400}
                placeholder="예) 동영상 재생 필요, 공동 발표자 있음 등" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>제출 현황</h2>
            {submitted.profile && submitted.talk && !dirty.profile && !dirty.talk ? (
              <p className="all-done">✓ 모든 정보가 제출되었습니다. 감사합니다! 마감 전까지 언제든 고칠 수 있어요.</p>
            ) : (
              <p className="muted">단계별로 따로 제출할 수 있어요. 아직 제출하지 않은 단계는 [작성하기]를 눌러 이어서 써 주세요.</p>
            )}

            <div className="review">
              <div className="review-head">
                <h3>기본 정보 <Badge at={submitted.profile} dirty={dirty.profile} /></h3>
                <button type="button" className="link" onClick={() => go(1)}>{submitted.profile ? "수정" : "작성하기"}</button>
              </div>
              {submitted.profile || dirty.profile ? (
                <>
                  <div className="review-profile">
                    <div className="thumb small">{preview ? <img src={preview} alt="" /> : <span>사진</span>}</div>
                    <dl>
                      <dt>이름</dt><dd>{v.name}{v.nameEn && ` (${v.nameEn})`}</dd>
                      <dt>소속·직책</dt><dd>{v.organization} · {v.position}</dd>
                      <dt>이메일</dt><dd>{v.email}</dd>
                      <dt>연락처</dt><dd>{v.phone}</dd>
                    </dl>
                  </div>
                  {v.bio && <p className="review-bio">{v.bio}</p>}
                </>
              ) : <p className="empty">아직 입력하지 않았어요.</p>}
            </div>

            <div className="review">
              <div className="review-head">
                <h3>발표 정보 <Badge at={submitted.talk} dirty={dirty.talk} /></h3>
                <button type="button" className="link" onClick={() => go(2)}>{submitted.talk ? "수정" : "작성하기"}</button>
              </div>
              {submitted.talk || dirty.talk ? (
                <dl>
                  <dt>세션</dt><dd>{v.session || "-"}</dd>
                  <dt>제목</dt><dd>{v.title || "-"}</dd>
                  <dt>요약</dt><dd className="pre">{v.summary || "-"}</dd>
                  <dt>자료</dt><dd>{v.material ? v.material.name : "추후 제출"}</dd>
                  <dt>리허설</dt><dd>{v.rehearsal.join(", ") || "-"}</dd>
                  <dt>녹화</dt><dd>{v.recording === "yes" ? "동의" : "동의하지 않음"}</dd>
                  {v.request && <><dt>요청</dt><dd className="pre">{v.request}</dd></>}
                </dl>
              ) : <p className="empty">아직 입력하지 않았어요.</p>}
            </div>
          </>
        )}
      </div>

      <div className="wizard-nav">
        {step > 0 ? <button type="button" className="btn ghost" onClick={() => go(step - 1)}>이전</button> : <span />}
        {step === 0 && invited && <button type="button" className="btn primary" onClick={start}>{started ? "다음" : "등록 시작하기"}</button>}
        {(step === 1 || step === 2) && (
          justSaved === SECTION_OF_STEP[step] ? (
            <button type="button" className="btn primary" onClick={() => go(step + 1)}>{step === 1 ? "발표정보 이어서 쓰기" : "제출 현황 보기"}</button>
          ) : (
            <button type="button" className="btn primary" onClick={saveSection} disabled={sending}>
              {sending ? "제출 중…" : `${step === 1 ? "기본정보" : "발표정보"} ${submitted[SECTION_OF_STEP[step]] ? "다시 제출" : "제출"}`}
            </button>
          )
        )}
      </div>
    </section>
  );
}

function Badge({ at, dirty }) {
  if (dirty) return <span className="badge draft">{at ? "수정 중 · 다시 제출 필요" : "작성 중 · 미제출"}</span>;
  if (at) return <span className="badge done">제출 완료 · {fmt(at)}</span>;
  return <span className="badge todo">미제출</span>;
}
