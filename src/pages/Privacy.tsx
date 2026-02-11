import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-6 h-14">
        <Link to="/" className="p-2 rounded-md hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">Privacy Policy</span>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
      <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: February 2026</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">1. Information We Collect</h2>
      <p className="text-muted-foreground leading-relaxed">We collect your email address and usage data when you create an account and interact with the Platform. We do not sell your personal information to third parties.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">2. How We Use Your Information</h2>
      <p className="text-muted-foreground leading-relaxed">Your information is used to provide and improve our services, send account-related communications, and maintain platform security.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">3. Data Security</h2>
      <p className="text-muted-foreground leading-relaxed">We implement industry-standard security measures to protect your data. All data is encrypted in transit and at rest.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">4. Cookies</h2>
      <p className="text-muted-foreground leading-relaxed">We use essential cookies for authentication and session management. No third-party advertising cookies are used.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">5. Your Rights</h2>
      <p className="text-muted-foreground leading-relaxed">You may request access to, correction of, or deletion of your personal data by contacting us at <a href="mailto:privacy@laurenzosgrapevine.io" className="text-primary hover:underline">privacy@laurenzosgrapevine.io</a>.</p>
      <h2 className="text-lg font-semibold text-foreground mt-8">6. Contact</h2>
      <p className="text-muted-foreground leading-relaxed">For privacy-related inquiries, email <a href="mailto:privacy@laurenzosgrapevine.io" className="text-primary hover:underline">privacy@laurenzosgrapevine.io</a>.</p>
    </main>
  </div>
);

export default Privacy;
