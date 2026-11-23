import { EVENT } from "@/lib/event";
import RegistrationForm from "./RegistrationForm";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="wrap">
          <p className="eyebrow">참석자 등록</p>
          <h1>{EVENT.title}</h1>
          <p className="subtitle">{EVENT.subtitle}</p>
          <dl className="facts">
            <div><dt>일시</dt><dd>{EVENT.date} {EVENT.time}</dd></div>
            <div><dt>장소</dt><dd>{EVENT.place}</dd></div>
            <div><dt>등록 마감</dt><dd>{EVENT.deadline}</dd></div>
          </dl>
        </div>
      </header>

      <div className="wrap grid">
        <section className="card">
          <h2>교육 일정</h2>
          <ol className="agenda">
            {EVENT.agenda.map((a) => (
              <li key={a.time}>
                <span className="time">{a.time}</span>
                <span>{a.title}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card" id="register">
          <h2>등록하기</h2>
          <p className="muted">모든 항목은 필수예요. 제출하면 입력하신 이메일로 확인 메일이 발송됩니다.</p>
          <RegistrationForm />
        </section>
      </div>

      <footer className="wrap footer">
        {EVENT.organizer}
        {EVENT.contactEmail ? <> · 문의 <a href={`mailto:${EVENT.contactEmail}`}>{EVENT.contactEmail}</a></> : null}
      </footer>
    </main>
  );
}
