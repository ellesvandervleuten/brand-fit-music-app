// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import { getServerSession } from 'next-auth/next'
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
                    // Alleen wat de app echt gebruikt: profiel/e-mail (/v1/me)
                    // en playlists aanmaken + vullen.
                    scope: [
                        "user-read-email",
                        "user-read-private",
                        "playlist-modify-private",
                        "playlist-modify-public",
                    ].join(" ")
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
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
        // Deze sessie gaat ook naar de browser (/api/auth/session):
        // het Spotify-token zit er bewust NIET in.
        async session({ session, token }) {
            session.error = token.error;
            return session;
        }
    }
};

// Alleen voor server-side API-routes: dezelfde sessie, maar met het
// Spotify-token erbij. Ververst het token automatisch als het verlopen is.
const serverAuthOptions = {
    ...authOptions,
    callbacks: {
        ...authOptions.callbacks,
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        }
    }
};

export function getSpotifySession(req, res) {
    return getServerSession(req, res, serverAuthOptions);
}

export default NextAuth(authOptions)