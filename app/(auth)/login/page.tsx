import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;

  const session = await auth();

  // if (session) redirect("/onboarding");
  const betaCode = params.code;
  const isValid = betaCode === process.env.BETA_ACCESS_CODE;

  return <LoginClient betaCode={betaCode} hasValidCode={isValid} />;
}
