import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import * as crypto from "crypto";
import * as db from "../database";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: `${process.env.PUBLIC_URL || process.env.BACKEND_BASE_URL || "http://localhost:3000"}/auth/google/callback`,
      scope: ["email"],
    },
    async (
      accessToken: string,
      refreshToken: string | undefined,
      profile: Profile,
      done: (err: any, user?: any) => void,
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        let user = db.findUserByEmail(email.toLowerCase().trim());

        if (user) {
          db.updateUserOauth(user.id, profile.id, "google");
        } else {
          const userId = `user-${crypto.randomUUID()}`;
          user = db.createUser({
            id: userId,
            email,
            name: email.split("@")[0],
            oauth_id: null,
            oauth_provider: "google",
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    },
  ),
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser(async (user: any, done) => {
  try {
    if (user && user.id) {
      const dbUser = db.findUserById(user.id);
      if (dbUser) {
        done(null, {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          oauthProvider: dbUser.oauth_provider || user.oauthProvider || 'test',
        });
      } else {
        done(null, null);
      }
    } else {
      done(null, null);
    }
  } catch (error) {
    done(error as Error);
  }
});

export default passport;
