import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import '../styles/globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Fafnir — AI Financial Agent',
  description:
    'Tell Fafnir your financial goal. It handles the rest. No crypto knowledge required.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
