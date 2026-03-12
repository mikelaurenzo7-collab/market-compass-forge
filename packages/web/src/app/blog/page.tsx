import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BeastBots Blog',
  description: 'The latest news, tips, and tricks for using BeastBots to automate your life.',
};

export default function BlogPage() {
  return (
    <main>
      <header className="text-center py-12">
        <h1 className="text-4xl font-bold">BeastBots Blog</h1>
        <p className="text-lg text-gray-600 mt-2">The latest news, tips, and tricks for using BeastBots to automate your life.</p>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* TODO: Add blog posts here */}
        <p className="text-center">Coming soon...</p>
      </div>
    </main>
  );
}
