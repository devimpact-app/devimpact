import { OneOnOnePrepClient } from './OneOnOnePrepClient';

export default async function OneOnOnePrepPage({
  searchParams,
}: {
  searchParams: Promise<{
    title?: string;
    shortWindowStart?: string;
    windowWeeks?: string;
  }>;
}) {
  const params = await searchParams;
  const initialTitle = params.title ?? undefined;
  const shortWindowStart = params.shortWindowStart;

  return (
    <OneOnOnePrepClient
      initialTitle={initialTitle}
      shortWindowStart={shortWindowStart}
    />
  );
}
