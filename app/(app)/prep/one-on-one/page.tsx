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
  const initialWindowWeeks =
    params.windowWeeks && ['1', '2', '4'].includes(params.windowWeeks)
      ? (Number(params.windowWeeks) as 1 | 2 | 4)
      : undefined;
  const shortWindowStart = params.shortWindowStart;

  return (
    <OneOnOnePrepClient
      initialTitle={initialTitle}
      initialWindowWeeks={initialWindowWeeks}
      shortWindowStart={shortWindowStart}
    />
  );
}
