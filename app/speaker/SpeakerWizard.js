"use client";

import { useEffect, useRef, useState } from "react";
import { SPEAKER } from "@/lib/event";

const STEPS = [
  { key: "guide", label: "연사 안내", short: "안내" },
  { key: "profile", label: "기본 정보", short: "기본정보" },
  { key: "talk", label: "발표 정보", short: "발표정보" },
  { key: "review", label: "확인·제출", short: "제출" },
];

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
  }
  if (step === 2) {
    if (!v.session) e.session = "발표 세션을 골라 주세요.";
    if (!v.title.trim()) e.title = "발표 제목을 입력해 주세요.";
    if (v.summary.trim().length < 20) e.summary = "발표 요약을 20자 이상 적어 주세요.";
    if (!v.rehearsal.length) e.rehearsal = "가능한 리허설 시간을 하나 이상 골라 주세요.";
  }
  if (step === 3) {
    if (!v.consentPrivacy) e.consentPrivacy = "개인정보 수집·이용에 동의해 주세요.";
  }
  return e;
}

export default function SpeakerWizard() {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0); // 지금까지 통과한 가장 먼 단계
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const topRef = useRef(null);
  const [v, setV] = useState({
    guideRead: false,
    name: "", nameEn: "", email: "", phone: "", organization: "", position: "", bio: "", photo: null,
    session: "", title: "", summary: "", material: null, rehearsal: [], recording: "yes", request: "",
    consentPrivacy: false,
  });

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function set(name, value) {
    setV((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  }
  const onInput = (e) => set(e.target.name, e.target.type === "checkbox" ? e.target.checked : e.target.value);

  function go(next) {
    setStep(next);
    setErrors({});
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function nextStep() {
    const e = validate(step, v);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`s-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    if (step === STEPS.length - 1) return submit();
    setReached((r) => Math.max(r, step + 1));
    go(step + 1);
  }

  function submit() {
    // 디자인 미리보기: 아직 저장하지 않고 완료 화면만 보여줍니다.
    setSending(true);
    setTimeout(() => { setSending(false); setDone(true); }, 600);
  }

  function toggleRehearsal(opt) {
    set("rehearsal", v.rehearsal.includes(opt) ? v.rehearsal.filter((x) => x !== opt) : [...v.rehearsal, opt]);
  }

  function onPhoto(e) {
    const f = e.target.files?.[0] || null;
    set("photo", f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  if (done) {
    return (
      <section className="card wizard" ref={topRef}>
        <div className="success" role="status">
          <div className="check" aria-hidden>✓</div>
          <h3>연사 등록이 완료되었습니다</h3>
          <p className="muted"><b>{v.email}</b>(으)로 접수 확인 메일과 리허설 일정 안내를 보내드려요.</p>
          <ul className="next-list">
            <li>발표자료 최종본: <b>{SPEAKER.materialDeadline}</b>까지</li>
            <li>리허설 일정은 담당자가 확정 후 메일로 알려드립니다.</li>
          </ul>
        </div>
      </section>
    );
  }

  const err = (k) => errors[k] && <p className="error" id={`e-${k}`}>{errors[k]}</p>;

  return (
    <section className="card wizard" ref={topRef}>
      <p className="preview-badge">디자인 미리보기 · 아직 실제로 저장되지 않아요</p>

      <ol className="steps" role="tablist" aria-label="등록 단계">
        {STEPS.map((s, i) => {
          const state = i === step ? "current" : i <= reached ? "done" : "locked";
          return (
            <li key={s.key} className={`step ${state}`}>
              <button type="button" role="tab" aria-selected={i === step} disabled={state === "locked"}
                onClick={() => go(i)}>
                <span className="num">{i < reached && i !== step ? "✓" : i + 1}</span>
                <span className="lbl"><span className="lbl-long">{s.label}</span><span className="lbl-short">{s.short}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="progress" aria-hidden><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>

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

            <label className="check-row confirm">
              <input id="s-guideRead" type="checkbox" name="guideRead" checked={v.guideRead} onChange={onInput} />
              <span>위 안내를 확인했습니다.</span>
            </label>
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
                    aria-invalid={!!errors[f.name]} />
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
            <h2>확인·제출</h2>
            <p className="muted">입력하신 내용을 확인해 주세요. 고칠 부분은 [수정]을 누르면 돼요.</p>

            <div className="review">
              <div className="review-head"><h3>기본 정보</h3><button type="button" className="link" onClick={() => go(1)}>수정</button></div>
              <div className="review-profile">
                <div className="thumb small">{preview ? <img src={preview} alt="" /> : <span>사진</span>}</div>
                <dl>
                  <dt>이름</dt><dd>{v.name}{v.nameEn && ` (${v.nameEn})`}</dd>
                  <dt>소속·직책</dt><dd>{v.organization} · {v.position}</dd>
                  <dt>이메일</dt><dd>{v.email}</dd>
                  <dt>연락처</dt><dd>{v.phone}</dd>
                </dl>
              </div>
              <p className="review-bio">{v.bio}</p>
            </div>

            <div className="review">
              <div className="review-head"><h3>발표 정보</h3><button type="button" className="link" onClick={() => go(2)}>수정</button></div>
              <dl>
                <dt>세션</dt><dd>{v.session}</dd>
                <dt>제목</dt><dd>{v.title}</dd>
                <dt>요약</dt><dd className="pre">{v.summary}</dd>
                <dt>자료</dt><dd>{v.material ? v.material.name : "추후 제출"}</dd>
                <dt>리허설</dt><dd>{v.rehearsal.join(", ")}</dd>
                <dt>녹화</dt><dd>{v.recording === "yes" ? "동의" : "동의하지 않음"}</dd>
                {v.request && <><dt>요청</dt><dd className="pre">{v.request}</dd></>}
              </dl>
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
      </div>

      <div className="wizard-nav">
        {step > 0 ? <button type="button" className="btn ghost" onClick={() => go(step - 1)}>이전</button> : <span />}
        <button type="button" className="btn primary" onClick={nextStep} disabled={sending}>
          {step === 0 ? "등록 시작하기" : step === STEPS.length - 1 ? (sending ? "제출 중…" : "제출하기") : "다음 단계"}
        </button>
      </div>
    </section>
  );
}
