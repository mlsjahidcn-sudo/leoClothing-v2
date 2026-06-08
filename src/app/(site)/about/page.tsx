import Image from 'next/image';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      {/* Hero */}
      <section className="bg-[#2C2C2C] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-4">About Us</p>
              <h1 className="font-serif text-4xl lg:text-5xl text-white mb-6" style={{ letterSpacing: '0.02em' }}>
                Manufacturing<br />Excellence Since 1998
              </h1>
              <p className="text-white/60 text-base leading-relaxed max-w-md">
                Chengfeng International is a premium menswear manufacturer based in Dongguan, China. 
                For over 20 years, we have partnered with 60+ brands worldwide, delivering 
                exceptional quality knitwear and tailored garments.
              </p>
            </div>
            <div className="relative h-[400px] lg:h-[500px] overflow-hidden">
              <Image
                src="/products/sweater-white.webp"
                alt="Chengfeng International manufacturing"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Key Figures */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: '20+', label: 'Years of Manufacturing' },
              { value: '60+', label: 'Brand Partners' },
              { value: '200+', label: 'Team Members' },
              { value: '15+', label: 'Export Countries' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-serif text-4xl lg:text-5xl text-[#B8956A] mb-2">{item.value}</p>
                <p className="text-[#2C2C2C]/50 text-xs tracking-[0.08em] uppercase">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-4">Our Story</p>
            <h2 className="font-serif text-2xl lg:text-3xl text-[#2C2C2C] mb-6" style={{ letterSpacing: '0.02em' }}>
              From Workshop to Global Partner
            </h2>
            <div className="space-y-4 text-[#2C2C2C]/60 text-sm leading-relaxed">
              <p>
                Founded in 1998 in Dongguan — China&apos;s garment manufacturing heartland — Chengfeng International 
                began as a small workshop with a simple mission: to produce menswear that matches international 
                quality standards at competitive prices.
              </p>
              <p>
                Over two decades, we have grown into a full-service manufacturer with specialized design teams, 
                in-house knitting workshops, and a vertically integrated production line. Our 20+ dedicated 
                designers research seasonal trends and consumer data across age groups, ensuring every collection 
                we develop is market-ready.
              </p>
              <p>
                Today, we serve brand retailers, wholesalers, and buying agencies across Asia, Europe, the Middle East, 
                and the Americas. Whether you need OEM production, ODM development, or private-label manufacturing, 
                Chengfeng delivers reliability at scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Factory Capabilities */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-4">Capabilities</p>
          <h2 className="font-serif text-2xl lg:text-3xl text-[#2C2C2C] mb-10" style={{ letterSpacing: '0.02em' }}>
            Factory & Production
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Knitwear Production',
                desc: 'Fine-gauge knitting machines with capacity for 12GG to 18GG. Specializing in polo shirts, knit tees, and lightweight sweaters.',
              },
              {
                title: 'Woven Garments',
                desc: 'Tailored trousers, shirts, and casual bottoms. Flat-front, pleated, and relaxed fits with precision cutting.',
              },
              {
                title: 'OEM & ODM Services',
                desc: 'Full-service product development from design concept to delivery. Custom fabrics, trims, labeling, and packaging.',
              },
              {
                title: 'Quality Control',
                desc: '3-stage inspection: incoming fabric, in-line production, and final shipment. AQL 2.5 standard on all orders.',
              },
              {
                title: 'Sampling',
                desc: 'Prototype samples within 7-10 business days. Color lab-dips and size-set samples available before production.',
              },
              {
                title: 'Flexible MOQ',
                desc: 'Starting from 50 units per color/style. Lower MOQ for trial orders. Volume discounts for large orders.',
              },
            ].map((item) => (
              <div key={item.title} className="border border-[#D9D4CE] p-6">
                <h3 className="font-serif text-base text-[#2C2C2C] mb-2">{item.title}</h3>
                <p className="text-[#2C2C2C]/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Composition */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-4">Client Portfolio</p>
          <h2 className="font-serif text-2xl lg:text-3xl text-[#2C2C2C] mb-10" style={{ letterSpacing: '0.02em' }}>
            Who We Serve
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                percentage: '40%',
                title: 'Domestic Retail Brands',
                desc: 'Seasonal collection development for national retail chains and specialty stores across China.',
              },
              {
                percentage: '30%',
                title: 'Custom Development',
                desc: 'Bespoke product development for brands requiring exclusive designs, fabrics, and specifications.',
              },
              {
                percentage: '30%',
                title: 'Trade & Export',
                desc: 'Wholesale manufacturing for international buyers, trade shows, and fashion agencies worldwide.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-[#D9D4CE] p-6">
                <p className="font-serif text-3xl text-[#B8956A] mb-1">{item.percentage}</p>
                <h3 className="font-serif text-base text-[#2C2C2C] mb-2">{item.title}</h3>
                <p className="text-[#2C2C2C]/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications & Trade Terms */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Certifications */}
            <div>
              <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-4">Certifications</p>
              <h2 className="font-serif text-xl text-[#2C2C2C] mb-6" style={{ letterSpacing: '0.04em' }}>
                Quality Assured
              </h2>
              <div className="space-y-4">
                {[
                  { name: 'BSCI', desc: 'Business Social Compliance Initiative — ethical manufacturing standards' },
                  { name: 'OEKO-TEX Standard 100', desc: 'Tested for harmful substances — safe for skin contact' },
                  { name: 'ISO 9001:2015', desc: 'Quality management system certification' },
                  { name: 'SEDEX', desc: 'Supplier ethical data exchange — transparent supply chain' },
                ].map((cert) => (
                  <div key={cert.name} className="border-l-2 border-[#B8956A] pl-4">
                    <p className="text-sm text-[#2C2C2C] font-medium">{cert.name}</p>
                    <p className="text-xs text-[#2C2C2C]/50 mt-0.5">{cert.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade Terms */}
            <div>
              <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-4">Trade Terms</p>
              <h2 className="font-serif text-xl text-[#2C2C2C] mb-6" style={{ letterSpacing: '0.04em' }}>
                Working With Us
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Incoterms', value: 'FOB Shenzhen / CIF / EXW' },
                  { label: 'Payment', value: 'T/T (30% deposit, 70% before shipment), L/C at sight' },
                  { label: 'Sample Policy', value: 'Sample fee refundable on bulk order placement' },
                  { label: 'Lead Time', value: '15–25 business days depending on order volume' },
                  { label: 'Shipping', value: 'Sea freight, air freight, express courier available' },
                  { label: 'Languages', value: 'English, Mandarin, Cantonese' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4 border-b border-[#D9D4CE] pb-3 last:border-0">
                    <span className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 w-28 shrink-0 pt-0.5">
                      {item.label}
                    </span>
                    <span className="text-sm text-[#2C2C2C]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-4">How It Works</p>
          <h2 className="font-serif text-2xl lg:text-3xl text-[#2C2C2C] mb-10" style={{ letterSpacing: '0.02em' }}>
            From Inquiry to Delivery
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Inquiry',
                desc: 'Submit your requirements — styles, quantities, customization needs.',
              },
              {
                step: '02',
                title: 'Sampling',
                desc: 'We develop prototypes and lab-dips within 7-10 days for your approval.',
              },
              {
                step: '03',
                title: 'Production',
                desc: 'Bulk manufacturing with in-line quality inspections at every stage.',
              },
              {
                step: '04',
                title: 'Delivery',
                desc: 'Final QC, packaging, and shipment to your warehouse or distribution center.',
              },
            ].map((item) => (
              <div key={item.step}>
                <p className="font-serif text-3xl text-[#D9D4CE] mb-3">{item.step}</p>
                <h3 className="font-serif text-base text-[#2C2C2C] mb-2">{item.title}</h3>
                <p className="text-[#2C2C2C]/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 lg:py-20 bg-[#2C2C2C]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl lg:text-3xl text-white mb-4" style={{ letterSpacing: '0.02em' }}>
            Ready to Start?
          </h2>
          <p className="text-white/50 text-sm mb-8 max-w-md mx-auto">
            Get in touch with our team to discuss your sourcing needs. We respond to all inquiries within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/inquiry"
              className="inline-flex items-center justify-center px-10 py-3.5 bg-[#B8956A] text-white text-sm tracking-[0.08em] uppercase hover:bg-[#B8956A]/90 transition-colors"
            >
              Request a Quote
            </a>
            <a
              href="mailto:info@chengfenginternational.com"
              className="inline-flex items-center justify-center px-10 py-3.5 border border-white/20 text-white text-sm tracking-[0.08em] uppercase hover:border-white/40 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
