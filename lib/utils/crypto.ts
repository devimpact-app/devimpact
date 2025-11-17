import crypto from "crypto";

export function generateCliToken(): string {
  const raw = crypto.randomBytes(24).toString("hex");
  return `devimpact_cli_${raw}`;
}

export function hashCliToken(token: string): string {
  return crypto
    .createHmac("sha256", process.env.CLI_TOKEN_SECRET!)
    .update(token)
    .digest("hex");
}
