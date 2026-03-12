import BotDetailPage from './bot-detail-client';

export async function generateStaticParams() {
  // A non-empty array is required for Next.js 14 static export; actual
  // bot pages are rendered entirely on the client side.
  return [{ id: '_' }];
}

export default function Page() {
  return <BotDetailPage />;
}
