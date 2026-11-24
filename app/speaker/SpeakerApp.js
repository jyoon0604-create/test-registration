"use client";

import { useEffect, useState } from "react";
import { TEXT } from "@/lib/speakerI18n";
import SpeakerWizard from "./SpeakerWizard";

// 연사 페이지 전체 (한국어 / English 전환). 언어는 ?lang=en 으로도 정할 수 있어요.
export default function SpeakerApp() {
  const [lang, setLang] = useState("ko");
  const [ready, setReady] = useState(false);
  const t = TEXT[lang];

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "en" || q === "ko") setLang(q);
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === "en" ? "Global Bio Conference 2027 · Speaker Guide" : "2027년 글로벌 바이오 콘퍼런스 연사 안내·등록";
  }, [lang]);

  function switchTo(next) {
    setLang(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  }

  const B = t.brand;
  const toggle = (
    <div className="lang-toggle" role="group" aria-label="Language">
      {["ko", "en"].map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? "on" : ""} onClick={() => switchTo(l)}>
          {l === "ko" ? "KOR" : "ENG"}
        </button>
      ))}
    </div>
  );

  return (
    <main className="speaker-page gbc">
      <header className="gbc-header">
        <div className="gbc-stripe" aria-hidden />
        <div className="wrap gbc-header-in">
          {/* 공식 로고 파일이 오면 이 자리를 <img src="/gbc-logo.svg">로 바꿉니다. */}
          <a className="gbc-logo" href="#" aria-label={B.name}>
            <span className="gbc-mark" aria-hidden>GBC</span>
            <span className="gbc-word"><b>{B.nameEn}</b><span>2027</span></span>
          </a>
          <div className="gbc-header-right">
            <span className="gbc-portal">{B.portal}</span>
            {toggle}
          </div>
        </div>
      </header>

      <section className="gbc-hero">
        <div className="gbc-hero-bg" aria-hidden />
        <div className="wrap gbc-hero-in">
          <p className="gbc-kicker"><span>{B.short}</span>{B.official}</p>
          <h1>{t.pageTitle}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <dl className="gbc-meta">
            <div><dt>{lang === "en" ? "Dates" : "일시"}</dt><dd>{t.heroWhen}</dd></div>
            <div><dt>{lang === "en" ? "Venue" : "장소"}</dt><dd>{t.heroWhere}</dd></div>
            <div><dt>{lang === "en" ? "Deadlines" : "제출 마감"}</dt><dd>{t.facts[1][1]}</dd></div>
          </dl>
        </div>
      </section>

      <div className="wrap wizard-wrap">
        {ready && <SpeakerWizard lang={lang} />}
      </div>

      <footer className="gbc-footer">
        <div className="wrap gbc-footer-in">
          <div>
            <p className="gbc-footer-name">{lang === "en" ? B.name + " 2027" : t.eventTitle}</p>
            <dl className="gbc-host">
              {t.foot.host.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
            </dl>
          </div>
          <div className="gbc-contact">
            <p><b>{t.foot.contact}</b></p>
            <p>{t.foot.mail} · {t.foot.tel}</p>
            <p>{t.foot.hours}</p>
          </div>
        </div>
        <p className="wrap gbc-copy">{t.foot.copy}</p>
      </footer>
    </main>
  );
}
