import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
      {/* Site-wide floating WhatsApp button — bottom-right.
          Hidden when no WhatsApp number is configured (renders null). */}
      <FloatingWhatsApp />
    </>
  );
}
