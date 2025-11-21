// import { auth } from '@/lib/auth'
// import { NextResponse } from 'next/server'
// import { getActiveIntegrationToken } from '@/lib/integrations/github/client'
// import { db } from '@/lib/db/client'
// import { githubRepos, RepositoryCreateInput, users } from '@/lib/db/schema'
// import { and, eq } from 'drizzle-orm'
// import { runSync } from '@/lib/integrations/github/sync/orchestrator'

// export async function GET(request: Request) {
//   const session = await auth()

//   if (!session?.user?.id) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   return NextResponse.json({
//     userId: session.user.id,
//     onboardingState: session.user.onboardingState,
//   })
// }

// // TODO: add zod types
// export async function POST(request: Request) {
//   const session = await auth()

//   if (!session?.user?.id || !session.user.githubUsername) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   try {
//     // Trigger sync
//     const result = await runSync({
//       tenantId: session.user.id,
//       githubLogin: session.user.githubUsername,
//     })

//     return NextResponse.json({
//       success: true,
//       ...result,
//     })
//   } catch (error) {
//     console.error('Sync error:', error)
//     return NextResponse.json(
//       {
//         error: error instanceof Error ? error.message : 'Sync failed',
//       },
//       { status: 500 }
//     )
//   }
// }
