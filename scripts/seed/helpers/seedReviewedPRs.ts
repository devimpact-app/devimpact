/* eslint-disable no-console */
import { db } from '@/lib/db/client'
import { githubPrs } from '@/lib/db/schema'
import { seedPrReview } from './seedPrReview'
import { randomTeammates, teamOf } from './teammates'
import { seedPrTimelineEvents } from './seedPrTimelineEvents'

// ---------- tiny helpers ----------
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const isWeekend = (d: Date) => [0, 6].includes(d.getDay())
export function weekdayNear(base: Date, spread = 2) {
  const d = new Date(base)
  d.setDate(d.getDate() + rand(0, spread))
  if (isWeekend(d)) {
    const bump = d.getDay() === 6 ? 2 : 1
    d.setDate(d.getDate() + bump)
  }
  const now = new Date()
  return d > now ? now : d
}
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const fakeIds = (repoFullName: string, prNumber: number) => {
  const base = Buffer.from(`${repoFullName}#${prNumber}`)
    .toString('base64')
    .replace(/=/g, '')
  return {
    externalId: `seed_team_pr_${base}`,
    externalNodeId: `PR_node_${base}`,
  }
}
function titleFor(repo: string) {
  const map: Record<string, string[]> = {
    'acme/frontend': [
      'component cleanup',
      'settings layout',
      'theme hook',
      'auth view',
      'pagination',
    ],
    'acme/api': [
      'webhook handler',
      'rate limiter',
      'cursor pagination',
      'token rotate',
      'error mapping',
    ],
    'acme/infra': [
      'terraform vpc',
      'docker cache',
      'ci matrix',
      'otel export',
      'redis sizing',
    ],
  }
  const verbs = ['feat', 'fix', 'refactor', 'docs', 'test', 'chore']
  const area = pick(map[repo] ?? ['misc'])
  return `${pick(verbs)}: ${area}`
}

// ---------- main seeder ----------
export async function seedReviewedPRs(params: {
  tenantId: string
  reviewerGithubLogin: string // you, e.g. "irichard620"
  repos: Array<{ fullName: string; owner: string; name: string }>
  lookbackDays?: number // default 90
}) {
  const { tenantId, reviewerGithubLogin, repos, lookbackDays = 90 } = params

  if (!repos.length) {
    console.warn('seedReviewedPRs: need repos & teammates; skipping.')
    return []
  }

  // target volume: ~3–6 reviews/week
  const weeks = Math.ceil(lookbackDays / 7)
  const totalPRs = rand(3, 6) * weeks // total team PRs you'll review

  // simple per-repo PR number cursors (if you want, query current max per repo instead)
  const perRepoNumber: Record<string, number> = {}
  for (const r of repos) perRepoNumber[r.fullName] = rand(300, 520)

  const createdRows: Array<{ prId: string }> = []

  for (let i = 0; i < totalPRs; i++) {
    // spread over time window, bias to weekdays
    const baseOffset = Math.floor((i / totalPRs) * lookbackDays)
    const createdAt = weekdayNear(daysAgo(lookbackDays - baseOffset), 2)

    const repo = pick(
      [
        repos[0],
        repos[0], // a bit more frontend
        repos[1],
        repos[1], // and api
        repos[2], // infra less frequent
      ].filter(Boolean)
    )

    const author = randomTeammates(1)[0] // teammate, not you
    const prNumber = ++perRepoNumber[repo.fullName]
    const ids = fakeIds(repo.fullName, prNumber)

    // states: mostly merged
    const r = Math.random()
    const state: 'open' | 'closed' = r < 0.9 ? 'closed' : 'open'
    const merged = r < 0.8

    const reviewLagDays = rand(0, 2) // you review within ~0-2 days
    const reviewedAt = weekdayNear(
      new Date(createdAt.getTime() + reviewLagDays * 864e5),
      1
    )

    const mergeLag = merged ? rand(0, 2) : 0
    const updatedAt =
      merged || state === 'closed' ? weekdayNear(reviewedAt, 1) : createdAt
    const mergedAt = merged
      ? weekdayNear(new Date(updatedAt.getTime() + mergeLag * 864e5), 0)
      : null
    const closedAt = state === 'closed' ? (mergedAt ?? updatedAt) : null

    const row = {
      tenantId,
      externalId: ids.externalId,
      externalNodeId: ids.externalNodeId,
      prNumber,
      repoFullName: repo.fullName,
      repoOwner: repo.owner,
      repoName: repo.name,
      title: titleFor(repo.fullName),
      body: `PR by ${author} in ${repo.fullName}.`,
      state,
      draft: Math.random() < 0.1,
      authorGithubLogin: author,
      createdAt,
      updatedAt,
      closedAt,
      htmlUrl: `https://github.com/${repo.fullName}/pull/${prNumber}`,
    }

    // upsert PR (team-authored)
    const [prRec] = await db
      .insert(githubPrs)
      .values(row)
      .onConflictDoUpdate({
        target: [
          githubPrs.tenantId,
          githubPrs.repoFullName,
          githubPrs.prNumber,
        ],
        set: {
          externalId: row.externalId,
          title: row.title,
          body: row.body,
          state: row.state,
          draft: row.draft,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          closedAt: row.closedAt,
          htmlUrl: row.htmlUrl,
        },
      })
      .returning()

    createdRows.push({ prId: prRec.id })

    const review = await seedPrReview({
      db, // pass your tx if inside a transaction
      pr: prRec,
      tenantId,
      reviewerGithubLogin, // you are the reviewer
      prNumber, // the PR number you generated
      repoFullName: repo.fullName,
      submittedAt: reviewedAt, // when you reviewed
      prAuthorGithubLogin: row.authorGithubLogin,
    })

    const requestedTeam = teamOf(reviewerGithubLogin)

    await seedPrTimelineEvents({
      db, // tx or db
      pr: prRec,
      tenantId,
      authorGithubLogin: author,
      requestedTeam: { slug: requestedTeam, org: repo.owner },
      reviews: [review],
      generateRequestsFromReviews: true,
    })
  }

  return createdRows
}
