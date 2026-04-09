import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TestingBuddy AI',
  description: 'Intelligent Test Planning Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
