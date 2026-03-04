import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Korean Writing Grader',
  description: 'AI grading dashboard for Korean writing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
