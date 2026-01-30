export default function WhyIBuiltThis() {
  return (
    <section className="relative w-full bg-[#0A0F1C] border-t border-white/5 py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white text-center mb-6">
          Why I built this
        </h2>

        <div className="space-y-6 text-center sm:text-lg text-white/70 leading-relaxed">
          <p>
            Most engineers I know are terrible at remembering what they worked
            on more than a couple weeks ago. When it's time for a 1:1 or
            performance review, everyone ends up scrolling through weeks of Git
            commits trying to piece together what actually happened. It's
            tedious and you usually forget half of it anyway.
          </p>

          <p>
            All the information is already there. Every commit, every PR, every
            meeting is logged somewhere. There's just no good way to look back
            at it without spending an hour digging through GitHub activity and
            trying to remember what those commit messages actually meant.
          </p>

          <p>
            So I built DevImpact to solve that problem. It pulls in GitHub
            activity and calendar events, organizes everything into threads, and
            generates summaries you can actually use. Now when you need to prep
            for a meeting or write a self review, you just open it up and
            everything's already there.
          </p>
        </div>
      </div>
    </section>
  );
}
