export default function Features() {
  return (
    <section className="w-full bg-[#0A0F1C] pt-20 pb-32 px-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            A clearer picture of your work
          </h2>
          <p className="mt-3 text-base text-white/70 leading-relaxed">
            DevImpact keeps your work organized, summarized, and easy to revisit
            — so you can bring context into meetings, reviews, and key
            conversations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: 'Show up to 1:1s with context',
              body: 'DevImpact prepares focused talking points based on what you’ve worked on since the last meeting.',
            },
            {
              title: 'Your work, organized over time',
              body: 'Contributions roll up into threads — giving you a clean, searchable record of projects and decisions as they evolve.',
            },
            {
              title: 'Your weekly work recap',
              body: 'Every week, DevImpact turns your real work into a concise summary — delivered to your inbox for reference later.',
            },
            // {
            //   title: 'Understand your work rhythm',
            //   body: 'Visualize when you tend to do deep work, where meetings land, and how your weeks actually unfold — so you can plan with more intention.',
            // },
          ].map((item) => (
            <div
              key={item.title}
              className="
                group relative overflow-hidden
                rounded-2xl border border-[#252B3F]
                bg-[#0B1020]
                px-6 py-5
                transition-all duration-150
                hover:-translate-y-[2px]
                hover:border-[#3B4A78]
                hover:bg-[#0D1220]
              "
            >
              <div className="mb-3 h-px w-10 bg-gradient-to-r from-[#6E8BFF] to-[#34D1C6]" />
              <h3 className="text-base font-semibold text-[#E2E6FF] mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-[#9AA4C6] leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
