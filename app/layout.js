import "./globals.css";
import { EVENT } from "@/lib/event";

export const metadata = {
  title: `${EVENT.title} 참석 등록`,
  description: `${EVENT.date} ${EVENT.time} · ${EVENT.subtitle}`,
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
