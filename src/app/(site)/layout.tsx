import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

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
      {/* Site-wide chatbot widget. Self-hides until first user
          interaction (renders null during SSR for hydration safety). */}
      <ChatbotWidget />
    </>
  );
}
