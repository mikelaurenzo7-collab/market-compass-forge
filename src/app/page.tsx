import Link from "next/link";

/**
 * Landing page — public entry point.
 * In production this would be a marketing page;
 * for now it routes authenticated users to the Command Center.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Laurenzo OS
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Deal Room & Private Market Intelligence
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          OpCo / PropCo separation. AI document extraction. Pipeline management.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Request Access
          </Link>
        </div>
      </div>
    </div>
  );
}
