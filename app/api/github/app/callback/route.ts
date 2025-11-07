// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/lib/db/client";
// import { integrationTokens } from "@/lib/db/schema";

// export async function GET(request: NextRequest) {
//   const params = request.nextUrl.searchParams;
//   const installationId = params.get("installation_id");
//   const setupAction = params.get("setup_action");
//   const state = params.get("state");

//   let userId: string | null = null;
//   let githubUsername: string | null = null;
//   try {
//     if (state) {
//       const decoded = JSON.parse(Buffer.from(state, "base64").toString());
//       userId = decoded.userId;
//       githubUsername = decoded.githubUsername;
//     }
//   } catch (e) {
//     return NextResponse.redirect(
//       new URL("/onboarding?error=invalid_state", request.url),
//     );
//   }

//   if (setupAction === "install" && installationId) {
//     if (userId) {
//       // Case 1: Direct installation
//       await db.insert(integrationTokens).values({
//         userId: userId,
//         provider: "github",
//         tokenType: "installation",
//         installationId: installationId,
//         accessToken: "",
//       });
//       return NextResponse.redirect(
//         new URL("/dashboard?status=connected", request.url),
//       );
//     } else {
//       // Case: 1b: Org installation - no userId
//       return NextResponse.redirect(
//         new URL(`/connected?installation_id=${installationId}`, request.url),
//       );
//     }
//   }

//   // Case 2: Approval required
//   if (setupAction === "request" && !!userId && !!githubUsername) {
//     await db.insert(githubPendingRequests).values({
//       userId: userId,
//       githubUsername,
//       status: "waiting",
//     });
//     // For now, just redirect with message
//     return NextResponse.redirect(
//       new URL("/dashboard?status=pending", request.url),
//     );
//   }

//   // Case 3: Update to existing installation
//   if (setupAction === "update" && installationId) {
//     // TODO: update installation
//     return NextResponse.redirect(
//       new URL("/dashboard?status=updated", request.url),
//     );
//   }

//   // Fallback
//   return NextResponse.redirect(new URL("/dashboard", request.url));
// }
