import { db } from '@/lib/db/client';
import { prepItems, prepRules } from '@/lib/db/schema';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { and, eq, inArray } from 'drizzle-orm';

export async function attachPrepLinks({
  tenantId,
  events,
}: {
  tenantId: string;
  events: UpcomingCalendarEvent[];
}): Promise<UpcomingCalendarEvent[]> {
  const googleEventIds = events.map((e) => e.googleEventId);
  const existingPrep = await db
    .select({
      googleEventId: prepItems.googleEventId,
      calendarId: prepItems.calendarId,
      prepItemId: prepItems.id,
    })
    .from(prepItems)
    .where(
      and(
        eq(prepItems.tenantId, tenantId),
        inArray(prepItems.googleEventId, googleEventIds)
      )
    );

  const prepByKey = new Map<string, string>();
  for (const p of existingPrep) {
    if (!p.googleEventId || !p.calendarId) continue;
    prepByKey.set(`${p.calendarId}::${p.googleEventId}`, p.prepItemId);
  }

  const recurringIds = Array.from(
    new Set(events.map((e) => e.recurringEventId).filter(Boolean) as string[])
  );

  let ruleBySeries = new Map<string, { id: string }>();
  if (recurringIds.length) {
    const rules = await db
      .select({
        recurringEventId: prepRules.recurringEventId,
        id: prepRules.id,
      })
      .from(prepRules)
      .where(
        and(
          eq(prepRules.tenantId, tenantId),
          eq(prepRules.isEnabled, true),
          inArray(prepRules.recurringEventId, recurringIds)
        )
      );

    ruleBySeries = new Map(
      rules.map((r) => [r.recurringEventId, { id: r.id }])
    );
  }

  return events.map((e) => {
    const prepItemId =
      prepByKey.get(`${e.calendarId}::${e.googleEventId}`) ?? null;
    const rule = e.recurringEventId
      ? ruleBySeries.get(e.recurringEventId)
      : undefined;

    return {
      ...e,
      prepItemId,
      hasPrepRule: !!rule,
      prepRuleId: rule?.id ?? null,
    };
  });
}
