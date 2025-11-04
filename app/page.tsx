export default function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">
            Track Your Engineering Impact
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Automatically generate performance review content from your GitHub
            activity
          </p>
          <a
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg"
          >
            Get Early Access
          </a>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Connect GitHub</h3>
            <p className="text-gray-400">
              Install our app to access your work data
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">2. AI Analysis</h3>
            <p className="text-gray-400">
              We analyze your PRs, commits, and reviews
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">3. Get Insights</h3>
            <p className="text-gray-400">
              Ready-to-use content for performance reviews
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400">
          <p>
            <a href="/privacy" className="hover:text-white">
              Privacy Policy
            </a>
            {" · "}
            <a href="mailto:hello@devimpact.app" className="hover:text-white">
              Contact
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
