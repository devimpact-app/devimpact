export default function Features() {
  return (
    <section className="w-full bg-[#0A0F1C] pt-20 pb-32 px-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Understand what shapes your impact
          </h2>
          <p className="mt-3 text-sm text-white/70 leading-relaxed">
            DevImpact surfaces the patterns that quietly shape your
            effectiveness — long before they show up in performance reviews.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: 'Work rhythm & focus',
              body: 'See when you naturally do your best work and how meetings, reviews, and interruptions gradually reshape those windows over time.',
            },
            {
              title: 'Where work slows down',
              body: 'Surface where work gets stuck — context switching, review pile-ups, coordination overhead, or tasks that consume time without moving outcomes forward.',
            },
            {
              title: 'Output vs coordination load',
              body: 'Track how your time shifts between building, reviewing, and coordinating, so role creep doesn’t happen invisibly.',
            },
            {
              title: 'Career-grade reflection',
              body: 'Walk into 1:1s and reviews with confidence, grounded in real work patterns',
            },
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
              <h3 className="text-sm font-semibold text-[#E2E6FF] mb-1">
                {item.title}
              </h3>
              <p className="text-[13px] text-[#9AA4C6] leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
