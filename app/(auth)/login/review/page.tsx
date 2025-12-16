import { ReviewLoginClient } from './ReviewLoginClient';

export default async function ReviewLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    t?: string;
  }>;
}) {
  const params = await searchParams;
  const token = params.t ?? undefined;

  return <ReviewLoginClient token={token} />;
}
