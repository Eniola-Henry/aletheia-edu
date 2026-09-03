import Link from "next/link";

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 md:pt-32 md:pb-36 text-center">
        <p className="rise-in text-xs sm:text-sm tracking-greek uppercase text-ink-faint mb-8">
          ἀλήθεια · that which is unconcealed
        </p>
        <h1 className="rise-in rise-in-delay-1 font-serif text-5xl sm:text-6xl md:text-7xl leading-[1.08] text-ink max-w-3xl mx-auto">
          Curriculum becomes
          <br />
          a comic you finish.
        </h1>
        <p className="rise-in rise-in-delay-2 mt-8 text-lg sm:text-xl text-ink-soft max-w-xl mx-auto leading-relaxed">
          For students who learn better through story than through dense pages.
          Read a chapter as a comic. Answer in your own words. Get corrected when it matters.
        </p>
        <div className="rise-in rise-in-delay-3 mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-10 py-4 rounded-full bg-ink text-cream text-base font-medium hover:bg-ink-soft transition-colors duration-200"
          >
            Begin learning
          </Link>
          <a
            href="#how"
            className="px-8 py-4 text-ink-soft hover:text-ink text-base transition-colors"
          >
            How it works
          </a>
        </div>
        <div className="greek-rule max-w-xs mx-auto mt-20 rise-in rise-in-delay-4" />
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-6 pb-28">
        <p className="text-center text-xs tracking-greek uppercase text-ink-faint mb-14">
          Three steps
        </p>
        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {[
            {
              n: "01",
              title: "Choose a subject",
              body: "Pick a seeded curriculum — or upload your own PDF notes. Facts stay anchored, not invented.",
            },
            {
              n: "02",
              title: "Cast a protagonist",
              body: "Name a character, pick a look, choose a genre. The story is theirs — and yours.",
            },
            {
              n: "03",
              title: "Read, answer, learn",
              body: "A comic chapter. One Socratic question. A score — and a real correction when you miss the point.",
            },
          ].map((step) => (
            <div key={step.n} className="relative text-center md:text-left space-y-4">
              <span className="font-serif text-4xl text-ink/15 block">{step.n}</span>
              <h2 className="font-serif text-2xl text-ink">{step.title}</h2>
              <p className="text-ink-soft leading-relaxed text-[15px]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Statement band */}
      <section className="border-y border-ink/10 bg-cream-alt">
        <div className="max-w-3xl mx-auto px-6 py-20 md:py-24 text-center relative greek-corner">
          <p className="font-serif text-2xl sm:text-3xl md:text-4xl leading-snug text-ink">
            Not another chatbot.
            <br />
            A short comic, then proof you understood.
          </p>
          <p className="mt-8 text-ink-soft max-w-md mx-auto leading-relaxed">
            Generation is only half the loop. The other half is assessment —
            scored against the same facts the comic was built from.
          </p>
        </div>
      </section>

      {/* Detail strip */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-28">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-6">
            <p className="text-xs tracking-greek uppercase text-ink-faint">Built for</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
              Students who close the textbook.
            </h2>
            <p className="text-ink-soft leading-relaxed">
              Long articles lose them. A consistent protagonist, clear panels,
              and one honest question at the end keep them reading — and thinking.
            </p>
          </div>
          <div className="space-y-8">
            {[
              { t: "Black & white ink", d: "Quiet, readable, consistent across every panel." },
              { t: "Fact-anchored chapters", d: "Demo subjects use verified facts, not free invention." },
              { t: "Correction when needed", d: "Low scores get a plain-language fix — not empty praise." },
              { t: "Your own PDF", d: "Upload notes or a syllabus chapter and forge a course from it." },
            ].map((item) => (
              <div key={item.t} className="border-t border-ink/10 pt-5">
                <h3 className="font-serif text-xl text-ink">{item.t}</h3>
                <p className="text-ink-soft text-sm mt-1.5 leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-32 text-center">
        <div className="greek-rule max-w-xs mx-auto mb-14" />
        <h2 className="font-serif text-3xl sm:text-4xl text-ink">Ready when you are.</h2>
        <p className="mt-4 text-ink-soft">No account form. You begin, the story begins.</p>
        <Link
          href="/dashboard"
          className="inline-block mt-10 px-10 py-4 rounded-full bg-ink text-cream text-base font-medium hover:bg-ink-soft transition-colors duration-200"
        >
          Enter Aletheia
        </Link>
      </section>

      <footer className="border-t border-ink/10 py-10 text-center">
        <p className="text-xs tracking-greek uppercase text-ink-faint">
          Aletheia.edu · learn through story
        </p>
      </footer>
    </div>
  );
}
