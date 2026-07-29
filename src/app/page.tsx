import Image from "next/image";
import Link from "next/link";

const products = [
  {
    name: "GATE Mock Test",
    status: "Live soon",
    description:
      "Calibrated CS practice, PYQ-first preparation, exam-like attempts, and score-leak diagnosis for serious GATE aspirants.",
    href: "/gate",
    active: true,
  },
  {
    name: "Recorded Learning Tracks",
    status: "Idea phase",
    description:
      "Structured recorded sessions with final exam attempts. This product is not open yet.",
    href: "#",
    active: false,
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Full-screen opening identity */}
      <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white">
        <div className="flex w-full items-center justify-center px-[4vw]">
          <Image
            src="/white_lemyte_logo.png"
            alt="Lemyte"
            width={6000}
            height={3375}
            priority
            className="h-auto w-[92vw] max-w-none object-contain"
          />
        </div>

      </section>

      {/* Full-width identity section */}
      <section className="w-full border-t border-neutral-100 px-[5vw] py-24 sm:py-32">
        <div className="grid w-full grid-cols-1 gap-16 xl:grid-cols-[0.95fr_1.05fr] xl:gap-24">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-[#193bc8]">
              Lemyte
            </p>

            <h1 className="mt-6 max-w-[900px] text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl 2xl:text-8xl">
              Knowledge is the only asset that cannot be taken away.
            </h1>
          </div>

          <div className="grid gap-10 xl:pt-16">
            <div className="border-l-4 border-[#193bc8] pl-6">
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                What it is
              </h2>
              <p className="mt-5 max-w-[880px] text-lg leading-9 text-neutral-700 xl:text-xl xl:leading-10">
                Lemyte is an education technology platform.
                To create a future in which education is universally acknowledged as the most valuable and imperishable asset, 
                acting as the ultimate catalyst for both individual and societal advancement. 
                We are here to ensure everyone is aware of one essential reality: knowledge is supreme.
              </p>
            </div>

            <div className="border-l-4 border-neutral-200 pl-6">
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                What it does
              </h2>
              <p className="mt-5 max-w-[880px] text-lg leading-9 text-neutral-700 xl:text-xl xl:leading-10">
                We engineer rigorous learning systems across competitive exam
                preparation and skill development. Our first product is a GATE
                mock-test engine focused on calibrated practice, PYQs,
                exam-like attempts, and clear performance reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Full-width products section */}
      <section className="w-full border-t border-neutral-100 px-[5vw] py-24 sm:py-32">
        <div className="grid w-full grid-cols-1 gap-16 xl:grid-cols-[0.75fr_1.25fr] xl:gap-24">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-[#193bc8]">
              Products
            </p>

            <h2 className="mt-6 max-w-[760px] text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Built for deliberate practice.
            </h2>

            <p className="mt-8 max-w-[620px] text-lg leading-9 text-neutral-700">
              Active products are linked. New initiatives are shown as planned
              or in development.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 xl:pt-12">
            {products.map((product) => {
              const card = (
                <div
                  className={`group flex min-h-[280px] flex-col justify-between rounded-[2rem] border p-8 transition ${
                    product.active
                      ? "border-neutral-200 bg-white hover:border-[#193bc8] hover:shadow-sm"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <h3 className="text-3xl font-black leading-none tracking-[-0.05em]">
                          {product.name}
                        </h3>

                        <p
                          className={`mt-4 inline-flex rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${
                            product.active
                              ? "bg-[#193bc8]/10 text-[#193bc8]"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {product.status}
                        </p>
                      </div>

                      {product.active ? (
                        <span className="text-4xl font-black text-[#193bc8] transition group-hover:translate-x-1">
                          ↗
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-8 text-base leading-8 text-neutral-700">
                      {product.description}
                    </p>
                  </div>

                  {product.active ? (
                    <div className="mt-10 text-sm font-black uppercase tracking-[0.2em] text-[#193bc8]">
                      Open product
                    </div>
                  ) : (
                    <div className="mt-10 text-sm font-black uppercase tracking-[0.2em] text-neutral-400">
                      Not open yet
                    </div>
                  )}
                </div>
              );

              if (!product.active) {
                return <div key={product.name}>{card}</div>;
              }

              return (
                <Link key={product.name} href={product.href}>
                  {card}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full-width manifesto strip */}
      <section className="w-full border-t border-neutral-100 bg-black px-[5vw] py-24 text-white sm:py-32">
        <div className="grid w-full grid-cols-1 gap-12 xl:grid-cols-[0.65fr_1.35fr] xl:items-end xl:gap-24">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-[#193bc8]">
              Manifesto
            </p>

            <p className="mt-6 max-w-[420px] text-lg leading-8 text-neutral-400">
              True wealth isn't measured in money, gold or land, but in the knowledge you carry. 
              Everything else is fleeting and just an illusion of security.
            </p>
          </div>

          <div>
            <blockquote className="max-w-[1200px] text-4xl font-black leading-[1.02] tracking-[-0.06em] sm:text-5xl lg:text-7xl">
              “What you see is what you hear, and what you feel becomes what you think.
               What you think becomes what you do.
               What you do is who you are.”
            </blockquote>

            <p className="mt-10 text-2xl font-black text-[#193bc8]">
              Read. Write. Learn. Repeat.
            </p>
          </div>
        </div>
      </section>

      {/* Full-width footer */}
      <footer className="w-full border-t border-neutral-100 px-[5vw] py-8">
        <div className="flex flex-col gap-6 text-sm text-neutral-500 lg:flex-row lg:items-center lg:justify-between">
          <Image
            src="/white_lemyte_logo.png"
            alt="lemyte"
            width={6000}
            height={3375}
            className="h-10 w-auto object-contain"
          />

          <div>© 2026 DXOCTAGON (OPC) Pvt Ltd.</div>
        </div>
      </footer>
    </main>
  );
}
