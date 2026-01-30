import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  // const params = await searchParams;

  const session = await auth();

  if (session) redirect('/onboarding');
  // const betaCode = params.code;
  // const isValid = betaCode === process.env.BETA_ACCESS_CODE;

  return <LoginClient hasValidCode={true} />;
}
