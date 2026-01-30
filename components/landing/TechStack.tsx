export default function TechStack() {
  return (
    <section className="relative w-full bg-[#070A12] py-20 px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center mb-12">
          Built with
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            'TypeScript',
            'React',
            'Next.js',
            'Postgres',
            'Vercel',
            'OpenAI API',
            'GitHub API',
            'Google Calendar API',
          ].map((tech) => (
            <div
              key={tech}
              className="
                rounded-lg border border-white/10 bg-white/5 
                px-4 py-3 text-sm font-medium text-white/80
                hover:border-white/20 hover:bg-white/10 transition
              "
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
