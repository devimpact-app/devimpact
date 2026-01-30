export default function Features() {
  return (
    <section className="w-full bg-[#0A0F1C] pt-20 pb-32 px-6">
      <div className="mx-auto max-w-6xl flex flex-col gap-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            A clearer picture of your work
          </h2>
          <p className="mt-4 text-lg text-white/70 leading-relaxed">
            DevImpact keeps your work organized, summarized, and easy to revisit
            — so you can bring context into meetings, reviews, and key
            conversations.
          </p>
        </div>

        <div className="flex flex-col gap-24">
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-4xl">
              <div className="relative rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl">
                <img
                  src="/images/beta/devimpact_meeting_prep.png"
                  alt="DevImpact meeting prep with auto-generated talking points and metrics"
                  className="w-full h-auto rounded-md"
                />
              </div>
            </div>

            <div className="text-center max-w-xl">
              <div className="mb-3 h-px w-10 bg-gradient-to-r from-[#6E8BFF] to-[#34D1C6] mx-auto" />
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                Never scramble before 1:1s
              </h3>
              <p className="text-base text-white/70 leading-relaxed">
                DevImpact prepares focused talking points based on what you've
                worked on since the last meeting. Show up with context on your
                progress, blockers, and wins.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-4xl">
              <div className="relative rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl">
                <img
                  src="/images/beta/devimpact_workstream.png"
                  alt="DevImpact workstream detail with AI-generated summary"
                  className="w-full h-auto rounded-md"
                />
              </div>
            </div>

            <div className="text-center max-w-xl">
              <div className="mb-3 h-px w-10 bg-gradient-to-r from-[#6E8BFF] to-[#34D1C6] mx-auto" />
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                Automatic context for every thread
              </h3>
              <p className="text-base text-white/70 leading-relaxed">
                Your contributions roll up into workstreams with AI-generated
                summaries. Get a clean, searchable record of projects and
                decisions as they evolve.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-4xl">
              <div className="relative rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl">
                <img
                  src="/images/beta/devimpact_timeline_updated.png"
                  alt="DevImpact timeline view showing work patterns across projects"
                  className="w-full h-auto rounded-md"
                />
              </div>
            </div>
            <div className="text-center max-w-xl">
              <div className="mb-3 h-px w-10 bg-gradient-to-r from-[#6E8BFF] to-[#34D1C6] mx-auto" />
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                Visualize your work patterns
              </h3>
              <p className="text-base text-white/70 leading-relaxed">
                See where your time goes across projects, meetings, and deep
                work. Understand your rhythm and plan your weeks with more
                intention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
