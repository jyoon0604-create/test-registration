"use client";

import { useEffect, useState } from "react";
import { SPEAKER } from "@/lib/event";
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
    document.title = lang === "en" ? "ICH Guideline Training · Speaker Guide" : "ICH 가이드라인 교육 연사 안내·등록";
  }, [lang]);

  function switchTo(next) {
    setLang(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="speaker-page">
      <div className="sp-topbar">
        <div className="wrap sp-topbar-in">
          <b>{t.eventTitle}</b>
          <div className="sp-topbar-right">
            <span className="sp-topbar-label">{t.topbar}</span>
            <div className="lang-toggle" role="group" aria-label="Language">
              {["ko", "en"].map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? "on" : ""} onClick={() => switchTo(l)}>
                  {l === "ko" ? "한국어" : "English"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        {/* 키비주얼(포스터·배너) 영역: lib/event.js의 SPEAKER.banner에 이미지 경로를 넣으면 표시됩니다. */}
        <figure className={`kv ${SPEAKER.banner ? "has" : ""}`}>
          {SPEAKER.banner ? (
            <img src={SPEAKER.banner} alt={t.pageTitle} />
          ) : (
            <figcaption><b>{t.kvTitle}</b><span>{t.kvHint}</span></figcaption>
          )}
        </figure>

        <section className="sp-intro">
          <p className="eyebrow">SPEAKER GUIDE</p>
          <h1>{t.pageTitle}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <dl className="sp-facts">
            {t.facts.map(([dt, dd]) => <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>)}
          </dl>
        </section>
      </div>

      <div className="wrap wizard-wrap">
        {ready && <SpeakerWizard lang={lang} />}
      </div>

      <footer className="wrap footer">{t.footer}</footer>
    </main>
  );
}
