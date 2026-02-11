import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-6 h-14">
        <Link to="/" className="p-2 rounded-md hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">Terms of Service</span>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
      <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: February 2026</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
      <p className="text-muted-foreground leading-relaxed">By accessing or using Laurenzo's Grapevine ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">2. Description of Service</h2>
      <p className="text-muted-foreground leading-relaxed">Laurenzo's Grapevine provides private market intelligence, estimated company valuations, deal flow tracking, and related analytics tools for informational purposes only. The Platform is not a registered broker-dealer or investment adviser.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">3. No Investment Advice</h2>
      <p className="text-muted-foreground leading-relaxed">All data, valuations, scores, and analysis provided on the Platform are estimates based on proprietary models and publicly available information. Nothing on this Platform constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or asset. Always conduct independent due diligence.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">4. User Obligations</h2>
      <p className="text-muted-foreground leading-relaxed">You agree to use the Platform only for lawful purposes. You may not scrape, redistribute, or resell any data without express written permission. You are responsible for maintaining the confidentiality of your account credentials.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">5. Limitation of Liability</h2>
      <p className="text-muted-foreground leading-relaxed">The Platform is provided "as is" without warranties of any kind. Laurenzo's Grapevine shall not be liable for any damages arising from the use of or inability to use the Platform.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">6. Contact</h2>
      <p className="text-muted-foreground leading-relaxed">For questions regarding these terms, please contact <a href="mailto:legal@laurenzosgrapevine.io" className="text-primary hover:underline">legal@laurenzosgrapevine.io</a>.</p>
    </main>
  </div>
);

export default Terms;
