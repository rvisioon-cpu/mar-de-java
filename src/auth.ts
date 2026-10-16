import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';


export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Usuario o correo electrónico", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') return null;

        const identifier = credentials.email.trim().toLowerCase();
        if (!identifier || !credentials.password) return null;

        const db = await getDb();
        // A name is accepted only when it identifies exactly one active user.
        // Existing email-based accounts continue to work unchanged.
        const matches = await db.select().from(users).where(and(
          isNull(users.deletedAt),
          identifier.includes('@')
            ? eq(sql`lower(${users.email})`, identifier)
            : eq(sql`lower(${users.name})`, identifier)
        )).limit(2);
        if (matches.length !== 1) return null;
        const user = matches[0];

        const { compare } = await import('bcryptjs');
        const passwordsMatch = await compare(credentials.password, user.password);

        if (passwordsMatch) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login', 
  }
});
