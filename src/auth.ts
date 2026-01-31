import NextAuth from "next-auth";
import Resend from "@auth/core/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const hasResend =
  !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },

  providers: [
    ...(hasResend
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY!,
            from: process.env.EMAIL_FROM!,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).xp = (user as any).xp ?? 0;
        (session.user as any).creditsBalance =
          (user as any).creditsBalance ?? 0;
        (session.user as any).membershipPlan =
          (user as any).membershipPlan ?? "FREE";
        (session.user as any).membershipActiveUntil =
          (user as any).membershipActiveUntil ?? null;
      }
      return session;
    },
  },
});
