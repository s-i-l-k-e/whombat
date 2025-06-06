import axios from "axios";
import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad";

const handler = NextAuth({
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID as string,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
            tenantId: process.env.AZURE_AD_TENANT_ID,
            authorization: {
                params: {
                    scope: `openid profile email ${process.env.AZURE_AD_API_SCOPE}`,
                },
            },
            profile(profile, tokens) {
                const idToken = tokens.id_token;
                if (!idToken) return {
                    ...profile
                };
                const decoded = JSON.parse(
                    Buffer.from(idToken.split(".")[1], "base64").toString("utf-8")
                );
                return {
                    id: decoded.oid,
                    name: decoded.name,
                    email: decoded.preferred_username || decoded.email,
                };
            },
        })
    ],
    pages: {
        signIn: "/login"
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account?.access_token) {
                token.accessToken = account.access_token;
            }
            if (profile?.email) {
                token.email = profile.email;
                token.name = profile.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.email && session?.user) {
                session.user.email = token.email;
            }
            if (token.accessToken) {
                (session as any).accessToken = token.accessToken;
            }
            return session;
        },
    },
    events: {
        async signIn({ user, account, profile }) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${account?.access_token}`;
        }
    },
    session:{
        strategy:"jwt"
    }
})

export { handler as GET, handler as POST }