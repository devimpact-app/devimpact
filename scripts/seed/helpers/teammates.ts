export const ORG_LOGIN = "acme"; // use whatever org slug you prefer
export const TEAMS = ["frontend", "platform"] as const;
export type TeamSlug = (typeof TEAMS)[number];

export type Teammate = {
  login: string;
  team: TeamSlug;
};

export const TEAMMATES: Teammate[] = [
  { login: "alice-dev", team: "frontend" },
  { login: "bmartinez", team: "frontend" },
  { login: "chen-liu", team: "platform" },
  { login: "dpatel", team: "platform" },
  { login: "emilia-k", team: "frontend" },
  { login: "fgarcia", team: "platform" },
];

// helpers
export function teamOf(login: string): TeamSlug {
  return TEAMMATES.find((t) => t.login === login)?.team ?? "platform";
}
export function teammatesIn(team: TeamSlug, exclude?: string[]): string[] {
  const ex = new Set(exclude ?? []);
  return TEAMMATES.filter((t) => t.team === team && !ex.has(t.login)).map(
    (t) => t.login,
  );
}
export function randomTeammates(n: number, exclude?: string[]): string[] {
  const ex = new Set(exclude ?? []);
  const pool = TEAMMATES.map((t) => t.login).filter((l) => !ex.has(l));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
