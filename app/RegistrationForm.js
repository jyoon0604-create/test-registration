"use client";

import { useEffect, useRef, useState } from "react";
import { validateFields, validatePhoto, MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/validate";

const FIELDS = [
  { name: "name", label: "이름", type: "text", autoComplete: "name", placeholder: "홍길동" },
  { name: "email", label: "이메일", type: "email", autoComplete: "email", placeholder: "name@company.com" },
  { name: "organization", label: "소속 (회사·기관)", type: "text", autoComplete: "organization", placeholder: "○○제약" },
  { name: "position", label: "부서·직책", type: "text", autoComplete: "organization-title", placeholder: "품질보증팀 / 대리" },
  { name: "phone", label: "연락처", type: "tel", autoComplete: "tel", placeholder: "010-1234-5678" },
];

// 큰 사진은 브라우저에서 줄여서 올립니다 (긴 변 1600px, JPEG).
async function shrinkImage(file) {
  if (file.size <= 1.5 * 1024 * 1024 && PHOTO_TYPES.includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // 줄이지 못하면 원본으로 검사
  }
}

export default function RegistrationForm() {
  const [values, setValues] = useState({ name: "", email: "", organization: "", position: "", phone: "", consent: false });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | done
  const [serverMessage, setServerMessage] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function update(e) {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  }

  async function onPhoto(e) {
    const raw = e.target.files?.[0];
    if (!raw) { setPhoto(null); setPreview(null); return; }
    const file = await shrinkImage(raw);
    const err = validatePhoto(file);
    setErrors((er) => ({ ...er, photo: err || undefined }));
    setPhoto(err ? null : file);
    setPreview(err ? null : URL.createObjectURL(file));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerMessage("");
    const errs = validateFields(values);
    const pe = validatePhoto(photo);
    if (pe) errs.photo = pe;
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }

    setStatus("submitting");
    const fd = new FormData(e.currentTarget);
    fd.set("photo", photo);
    fd.set("consent", values.consent ? "true" : "");
    try {
      const res = await fetch("/api/register", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ ok: false, message: "서버 응답을 읽지 못했어요." }));
      if (!data.ok) {
        setErrors(data.errors || {});
        setServerMessage(data.message || "등록 중 문제가 생겼어요.");
        setStatus("idle");
        return;
      }
      setResult({ ...data, email: values.email });
      setStatus("done");
    } catch {
      setServerMessage("네트워크 연결을 확인하고 다시 시도해 주세요.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="success" role="status">
        <div className="check" aria-hidden>✓</div>
        <h3>등록이 완료되었습니다</h3>
        <p>등록번호 <b>{result.registrationId}</b></p>
        {result.mailSent === true && (
          <p className="muted"><b>{result.email}</b>(으)로 확인 메일을 보냈어요. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
        )}
        {result.mailSent === false && (
          <p className="warn">등록은 저장됐지만 확인 메일 발송에 실패했어요. 담당자에게 문의해 주세요.</p>
        )}
        {result.mailSent == null && (
          <p className="muted">등록번호를 메모해 두시면 문의할 때 편리해요.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {FIELDS.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={`f-${f.name}`}>{f.label}</label>
          <input
            id={`f-${f.name}`}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            value={values[f.name]}
            onChange={update}
            aria-invalid={!!errors[f.name]}
            aria-describedby={errors[f.name] ? `e-${f.name}` : undefined}
            maxLength={100}
          />
          {errors[f.name] && <p className="error" id={`e-${f.name}`}>{errors[f.name]}</p>}
        </div>
      ))}

      <div className="field">
        <label htmlFor="f-photo">사진</label>
        <div className="photo">
          <div className="thumb">{preview ? <img src={preview} alt="첨부한 사진 미리보기" /> : <span>사진</span>}</div>
          <div>
            <input id="f-photo" ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} onChange={onPhoto}
              aria-invalid={!!errors.photo} aria-describedby="h-photo" />
            <p className="hint" id="h-photo">JPG·PNG·WEBP, {MAX_PHOTO_BYTES / 1024 / 1024}MB 이하. 큰 사진은 자동으로 줄여서 올라가요.</p>
          </div>
        </div>
        {errors.photo && <p className="error">{errors.photo}</p>}
      </div>

      {/* 스팸 방지용 숨김 칸 */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />

      <div className="consent">
        <p className="consent-text">
          <b>개인정보 수집·이용 안내</b><br />
          수집 항목: 이름, 이메일, 소속, 부서·직책, 연락처, 사진<br />
          이용 목적: 교육 참석자 확인 및 안내 메일 발송<br />
          보유 기간: 교육 종료 후 1년 (이후 파기)<br />
          동의를 거부할 수 있으나, 이 경우 등록이 어렵습니다.
        </p>
        <label className="check-row">
          <input id="f-consent" type="checkbox" name="consent" checked={values.consent} onChange={update} aria-invalid={!!errors.consent} />
          <span>위 내용에 동의합니다. (필수)</span>
        </label>
        {errors.consent && <p className="error">{errors.consent}</p>}
      </div>

      {serverMessage && <p className="banner" role="alert">{serverMessage}</p>}

      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "등록 중…" : "등록 제출"}
      </button>
    </form>
  );
}
