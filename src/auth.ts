import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Email({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        if (!process.env.RESEND_API_KEY) {
          throw new Error("Missing RESEND_API_KEY");
        }
        if (!process.env.EMAIL_FROM) {
          throw new Error("Missing EMAIL_FROM");
        }
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: identifier,
          subject: "Your sign-in link",
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5">
              <h2>Sign in</h2>
              <p>Click this link to sign in:</p>
              <p><a href="${url}">${url}</a></p>
              <p>If you did not request this, you can ignore this email.</p>
            </div>
          `,
        });
      },
    }),
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
        (session.user as any).creditsBalance = (user as any).creditsBalance ?? 0;
        (session.user as any).membershipPlan = (user as any).membershipPlan ?? "FREE";
        (session.user as any).membershipActiveUntil = (user as any).membershipActiveUntil ?? null;
      }
      return session;
    },
  },
});
