import { EVENT, SPEAKER } from "@/lib/event";
import SpeakerWizard from "./SpeakerWizard";

export const metadata = {
  title: `${EVENT.title} 연사 안내·등록`,
  description: `${EVENT.date} ${EVENT.time} · 연사 안내 및 등록`,
};

export default function SpeakerPage() {
  return (
    <main className="speaker-page">
      <div className="sp-topbar">
        <div className="wrap sp-topbar-in">
          <b>{EVENT.title}</b>
          <span>연사 안내 · 등록</span>
        </div>
      </div>

      <div className="wrap">
        {/* 키비주얼(포스터·배너) 영역: lib/event.js의 SPEAKER.banner에 이미지 경로를 넣으면 표시됩니다. */}
        <figure className={`kv ${SPEAKER.banner ? "has" : ""}`}>
          {SPEAKER.banner ? (
            <img src={SPEAKER.banner} alt={`${EVENT.title} 키비주얼`} />
          ) : (
            <figcaption>
              <b>키비주얼 · 포스터 배너 영역</b>
              <span>권장 크기 1920 × 640px (3:1) · 이미지가 준비되면 이 자리에 들어갑니다</span>
            </figcaption>
          )}
        </figure>

        <section className="sp-intro">
          <p className="eyebrow">SPEAKER GUIDE</p>
          <h1>{EVENT.title} 연사 안내</h1>
          <p className="subtitle">연사로 함께해 주셔서 감사합니다. 아래 단계를 따라 안내를 확인하고 정보를 등록해 주세요.</p>
          <dl className="sp-facts">
            <div><dt>교육 일시</dt><dd>{EVENT.date} {EVENT.time}</dd></div>
            <div><dt>진행</dt><dd>온라인 (Zoom 웨비나)</dd></div>
            <div><dt>연사 등록 마감</dt><dd>{SPEAKER.deadline}</dd></div>
          </dl>
        </section>
      </div>

      <div className="wrap wizard-wrap">
        <SpeakerWizard />
      </div>

      <footer className="wrap footer">
        {EVENT.organizer}
        {EVENT.contactEmail ? <> · 문의 <a href={`mailto:${EVENT.contactEmail}`}>{EVENT.contactEmail}</a></> : null}
      </footer>
    </main>
  );
}
