// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

// REFRESH FUNCTIE
async function refreshAccessToken(token) {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken
            })
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error('Error refreshing access token:', error);
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        };
    }
}

export const authOptions = {
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: [
                        // Basis scopes (die je al hebt)
                        "user-read-email",
                        "user-read-private",
                        "playlist-modify-private",
                        "playlist-modify-public",

                        // Extra scopes die kunnen helpen
                        "user-library-read",
                        "user-library-modify",
                        "user-top-read",
                        "user-read-recently-played",
                        "user-read-currently-playing",
                        "user-read-playback-state",
                        "user-follow-read",
                        "playlist-read-private",
                        "playlist-read-collaborative"
                    ].join(" ")
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                console.log("=== NEW LOGIN SCOPES ===");
                console.log("Account scope:", account.scope);
                console.log("========================");
                return {
                    accessToken: account.access_token,
                    accessTokenExpires: Date.now() + account.expires_in * 1000,
                    refreshToken: account.refresh_token,
                    user: token.user,
                };
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < token.accessTokenExpires) {
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        }
    }
};

export default NextAuth(authOptions)