import { EVENT, SPEAKER } from "@/lib/event";
import SpeakerWizard from "./SpeakerWizard";

export const metadata = {
  title: `${EVENT.title} 연사 안내·등록`,
  description: `${EVENT.date} ${EVENT.time} · 연사 안내 및 등록`,
};

export default function SpeakerPage() {
  return (
    <main>
      <header className="hero hero-speaker">
        <div className="wrap">
          <p className="eyebrow">연사 안내 · 등록</p>
          <h1>{EVENT.title}</h1>
          <p className="subtitle">연사로 함께해 주셔서 감사합니다. 아래 단계를 따라 안내를 확인하고 정보를 등록해 주세요.</p>
          <dl className="facts">
            <div><dt>교육 일시</dt><dd>{EVENT.date} {EVENT.time}</dd></div>
            <div><dt>진행</dt><dd>온라인 (Zoom 웨비나)</dd></div>
            <div><dt>연사 등록 마감</dt><dd>{SPEAKER.deadline}</dd></div>
          </dl>
        </div>
      </header>

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
