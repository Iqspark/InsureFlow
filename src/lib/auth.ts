import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Throttle credential stuffing / brute force. Keyed per-account and per-IP;
        // over the limit we fail closed (return null = "invalid credentials") so
        // there's no lockout oracle. In-memory + per-process (see rateLimit.ts).
        const xff = (req?.headers?.["x-forwarded-for"] as string | undefined) ?? "";
        const ip = xff.split(",")[0]?.trim() || "unknown";
        if (!rateLimit(`login:${email}`, 10, 5 * 60_000).ok) return null;
        if (!rateLimit(`login-ip:${ip}`, 50, 5 * 60_000).ok) return null;

        const broker = await prisma.broker.findUnique({
          where: { email },
        });

        if (!broker || !broker.active) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          broker.password
        );
        if (!passwordMatch) return null;

        return {
          id: broker.id,
          name: broker.name,
          email: broker.email,
          role: broker.role as "ADMIN" | "BROKER" | "UNDERWRITER",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as { role?: "ADMIN" | "BROKER" | "UNDERWRITER" }).role ?? "BROKER";
        token.active = true;
        if (process.env.SESSION_VERSION) token.v = process.env.SESSION_VERSION;
        return token;
      }
      // On every subsequent request, re-validate against the DB so deactivation
      // and role changes take effect immediately instead of waiting up to 8h for
      // the JWT to expire.
      if (token.id) {
        const broker = await prisma.broker.findUnique({
          where: { id: token.id as string },
          select: { role: true, active: true },
        });
        token.active = !!broker?.active;
        if (broker?.active) token.role = broker.role as "ADMIN" | "BROKER" | "UNDERWRITER";
      }
      return token;
    },
    async session({ session, token }) {
      // A deactivated (or deleted) account drops its user so every guard that
      // checks `session.user` treats the request as logged out.
      if (token?.active === false) {
        return { ...session, user: undefined } as unknown as typeof session;
      }
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as "ADMIN" | "BROKER" | "UNDERWRITER") ?? "BROKER";
      }
      return session;
    },
  },
};
