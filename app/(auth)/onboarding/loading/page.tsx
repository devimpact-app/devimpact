import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { getJobStatusForTenant } from '@/lib/domains/jobs/db/getJobStatus';
import { redirect } from 'next/navigation';
import { LoadingClient } from './LoadingClient';
import { JobPublicSchema } from '@/types/api/jobs';

export default async function LoadingPage() {
  const session = await auth();
  const userFromSession = session?.user;
  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect('/login');
  }

  const jobRow = await getJobStatusForTenant(db, {
    tenantId: userFromSession.id,
    kind: 'setup_bootstrap_recent',
    dedupeKey: 'bootstrap_recent',
  });

  const parsed = jobRow ? JobPublicSchema.safeParse(jobRow) : null;
  const initialJob = parsed?.success ? parsed.data : null;

  if (parsed && !parsed.success) {
    console.error('[LOADING PAGE] Invalid job row shape', parsed.error);
  }

  if (initialJob?.status === 'succeeded') redirect('/onboarding/complete');

  return <LoadingClient initialJob={initialJob} />;
}
