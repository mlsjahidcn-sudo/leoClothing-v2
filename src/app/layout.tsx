import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Chengfeng International | Premium Menswear',
    template: '%s | Chengfeng International',
  },
  description:
    'Chengfeng International — Over 20 years of premium menswear excellence. Providing seasonal product development and full-chain services for renowned fashion brands nationwide.',
  keywords: [
    'Chengfeng International',
    'premium menswear',
    'luxury menswear',
    'cashmere coat',
    'bespoke clothing',
    'fashion manufacturing',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
