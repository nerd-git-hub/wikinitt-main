import NextAuth, { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { GraphQLClient } from "graphql-request";
import { gql } from "@/gql";
import { ADMIN_LOGIN_MUTATION } from "@/gql/admin";
import { GetCurrentUserQuery } from "@/gql/graphql";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = new GraphQLClient(
          process.env.NEXT_PUBLIC_GRAPHQL_API_URL!,
        );

        try {
          const data = await client.request<{ login: string }>(
            ADMIN_LOGIN_MUTATION,
            {
              input: {
                email: credentials.email,
                password: credentials.password,
              },
            },
          );

          if (data.login) {
            return {
              id: "admin",
              email: credentials.email as string,
              name: "Admin",
              backendToken: data.login,
              isAdmin: true,
              setupComplete: true,
            };
          }
          return null;
        } catch (error) {
          console.error("Admin Login Failed:", error);
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, profile, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.user) {
          token.username = session.user.username;
          token.displayName = session.user.displayName;
          token.setupComplete = session.user.setupComplete;
        }
        return token;
      }

      if (user) {
        if (account?.provider === "credentials") {
          token.backendToken = (user as User).backendToken;
          token.isAdmin = true;
          token.setupComplete = true;
          return token;
        }

        const mutation = gql(`
        mutation SignIn($input: NewUser!) {
          signIn(input: $input)
        }
          `);

        const graphQLClient = new GraphQLClient(
          process.env.NEXT_PUBLIC_GRAPHQL_API_URL!,
        );

        try {
          const response = await graphQLClient.request(mutation, {
            input: {
              id: String(profile!.sub || user.id),
              name: user.name!,
              email: user.email!,
              gender: "unknown",
              phoneNumber: "unknown",
              machineToken: process.env.MACHINE_TOKEN!,
            },
          });
          token.backendToken = response.signIn;

          const userQuery = gql(`
            query GetCurrentUser {
              me {
                id
                username
                displayName
                setupComplete
                isAdmin
              }
            }
          `);

          try {
            const authenticatedClient = new GraphQLClient(
              process.env.NEXT_PUBLIC_GRAPHQL_API_URL!,
              {
                headers: {
                  Authorization: `Bearer ${token.backendToken}`,
                },
              },
            );

            const userData =
              await authenticatedClient.request<GetCurrentUserQuery>(userQuery);
            if (userData.me) {
              token.username = userData.me.username;
              token.displayName = userData.me.displayName;
              token.setupComplete = userData.me.setupComplete;
              token.isAdmin = userData.me.isAdmin;
              token.id = userData.me.id;
            } else {
            }
          } catch (error) {
            console.error("Failed to fetch user details:", error);
          }
        } catch (error) {
          console.error("Backend Sync Failed:", error);
        }
      }

      if (token.backendToken && !token.id) {
        const userQuery = gql(`
            query GetCurrentUser {
              me {
                id
                username
                displayName
                setupComplete
                isAdmin
              }
            }
          `);

        try {
          const authenticatedClient = new GraphQLClient(
            process.env.NEXT_PUBLIC_GRAPHQL_API_URL!,
            {
              headers: {
                Authorization: `Bearer ${token.backendToken}`,
              },
            },
          );

          const userData =
            await authenticatedClient.request<GetCurrentUserQuery>(userQuery);
          if (userData.me) {
            token.username = userData.me.username;
            token.displayName = userData.me.displayName;
            token.setupComplete = userData.me.setupComplete;
            token.isAdmin = userData.me.isAdmin;
            token.id = userData.me.id;
          }
        } catch (error) {
          console.error("Failed to refresh user details:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.backendToken) {
        session.backendToken = token.backendToken as string;
      }
      if (token.isAdmin) {
        session.user.isAdmin = true;
      }

      if (token.username) session.user.username = token.username as string;
      if (token.displayName)
        session.user.displayName = token.displayName as string;
      if (token.setupComplete !== undefined)
        session.user.setupComplete = token.setupComplete as boolean;

      if (token.id) {
        session.user.id = token.id as string;
      } else if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
