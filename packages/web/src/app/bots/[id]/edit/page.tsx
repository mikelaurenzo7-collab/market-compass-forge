import EditBotPage from './edit-bot-client';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <EditBotPage />;
}
