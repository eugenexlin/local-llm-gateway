import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as db from '../database';

passport.use(
  new GoogleStrategy(
     {
       clientID: process.env.GOOGLE_CLIENT_ID || '',
       clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
       callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
       scope: ['email'],
     },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        let user = db.findUserByEmail(email.toLowerCase().trim());

        if (user) {
          db.updateUserOauth(user.id, profile.id, 'google');
        } else {
          const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          user = db.createUser({
            id: userId,
            email,
            name: email.split('@')[0],
            oauth_id: null,
            oauth_provider: 'google',
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = db.findUserById(id);
    done(null, user || null);
  } catch (error) {
    done(error as Error);
  }
});

export default passport;
