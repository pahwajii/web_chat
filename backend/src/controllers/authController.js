import User from '../models/user.js';

/**
 * Handles Google OAuth ID token verification and user signup/login.
 */
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID Token is required.' });
    }

    // Verify token using Google tokeninfo API endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google token verification failed:', errorData);
      return res.status(401).json({ message: 'Invalid Google ID Token', error: errorData.error_description });
    }

    const payload = await response.json();
    const { sub: googleId, email, name, picture } = payload;

    if (!googleId || !email) {
      return res.status(400).json({ message: 'Invalid token payload details.' });
    }

    // Check if user exists in the database
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Update profile picture and name in case they changed on Google
      let updated = false;
      if (user.picture !== picture) {
        user.picture = picture;
        updated = true;
      }
      if (user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (user.googleId !== googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // Create new user profile
      user = new User({
        googleId,
        email,
        name,
        picture,
      });
      await user.save();
    }

    res.status(200).json({
      message: 'Authentication successful',
      user: {
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('Error in Google authentication:', error);
    res.status(500).json({ message: 'Internal Server Error during Google Auth', error: error.message });
  }
};
