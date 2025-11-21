import { auth } from '@/lib/auth'
import { jsonOK, jsonUnauthorized } from '../../_lib/http'
import { StoryId } from '@/lib/analysis/stories/types'
import { generateStoriesBatch } from '@/lib/analysis/stories/runBatch'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonUnauthorized()
  }

  const { searchParams } = new URL(req.url)
  const start = new Date(
    searchParams.get('start') ?? Date.now() - 30 * 86400 * 1000
  )
  const end = new Date(searchParams.get('end') ?? Date.now())

  const ids = searchParams.getAll('id') as StoryId[] // optional

  const stories = await generateStoriesBatch(
    { tenantId: session.user.id, start, end },
    ids.length ? ids : undefined
  )

  return jsonOK({ stories })
}
