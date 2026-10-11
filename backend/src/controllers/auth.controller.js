import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { createToken } from '../utils/jwt.js';
import { loginSchema, parseBody, registerSchema, passwordPolicyMessage, strongPasswordSchema } from '../utils/validators.js';

function readCredentials(body, isRegistration = false) {
    const schema = isRegistration ? registerSchema : loginSchema;
    const parsed = parseBody(schema, body);
    if (parsed.error) return { error: parsed.error };

    return {
        credentials: {
            ...(isRegistration ? { name: parsed.data.name } : {}),
            email: parsed.data.email,
            password: parsed.data.password,
        },
    };
}

function respondWithToken(user, res, status = 200) {
    try {
        const token = createToken(user);
        return res.status(status).json({ user, token });
    } catch {
        return res.status(503).json({ message: 'Authentication is not configured' });
    }
}

export async function register(req, res) {
    const { credentials, error } = readCredentials(req.body, true);
    if (error) return res.status(400).json({ message: error });
    if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Authentication is not configured' });

    try {
        const user = await authService.registerUser(credentials);
        return respondWithToken(user, res, 201);
    } catch (databaseError) {
        if (databaseError.code === 'P2002') {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }
        console.error(databaseError);
        return res.status(500).json({ message: 'Could not register account' });
    }
}

export async function login(req, res) {
    const { credentials, error } = readCredentials(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Authentication is not configured' });

    try {
        const user = await authService.authenticateUser(credentials.email, credentials.password);
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });
        return respondWithToken(user, res);
    } catch (databaseError) {
        console.error(databaseError);
        return res.status(500).json({ message: 'Could not log in' });
    }
}

export async function getCurrentUser(req, res) {
    try {
        const user = await authService.getUserById(req.user.sub);
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        return res.json({ user });
    } catch (databaseError) {
        console.error(databaseError);
        return res.status(500).json({ message: 'Could not load account' });
    }
}

export async function updateCurrentUser(req, res) {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const name = typeof body.name === 'string' ? body.name : undefined;
    const password = typeof body.password === 'string' && body.password.trim() ? body.password : undefined;

    if (!name && !password) {
        return res.status(400).json({ message: 'Provide a new name or password to update your account.' });
    }

    if (name !== undefined) {
        const nameValidation = parseBody(z.object({ name: registerSchema.shape.name }).passthrough(), { name }, 'Name is required');
        if (nameValidation.error) return res.status(400).json({ message: nameValidation.error });
    }

    if (password !== undefined) {
        const parsed = parseBody(z.object({ password: strongPasswordSchema }).passthrough(), { password }, passwordPolicyMessage);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
    }

    try {
        const updatedUser = await authService.updateUserProfile(req.user.sub, { name, password });
        return respondWithToken(updatedUser, res);
    } catch (error) {
        console.error(error);
        return res.status(400).json({ message: error.message || 'Could not update your account.' });
    }
}

export function googleConfig(req, res) {
    return res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
}

export async function googleLogin(req, res) {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const credential = typeof body.credential === 'string' ? body.credential : '';
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ message: 'Google sign-in is not configured yet. Set GOOGLE_CLIENT_ID to enable it.' });
    }
    if (!credential) {
        return res.status(400).json({ message: 'Google credential is required.' });
    }

    let googleProfile;
    try {
        const verifyUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
        verifyUrl.searchParams.set('id_token', credential);
        const verificationResponse = await fetch(verifyUrl, { signal: AbortSignal.timeout(5000) });
        if (!verificationResponse.ok) {
            return res.status(401).json({ message: 'Google account verification failed.' });
        }
        googleProfile = await verificationResponse.json();
    } catch {
        return res.status(503).json({ message: 'Google sign-in verification is temporarily unavailable.' });
    }

    const issuerIsValid = ['accounts.google.com', 'https://accounts.google.com'].includes(googleProfile.iss);
    const emailIsVerified = googleProfile.email_verified === true || googleProfile.email_verified === 'true';
    const tokenIsValid = googleProfile.aud === process.env.GOOGLE_CLIENT_ID
        && issuerIsValid
        && Number(googleProfile.exp) > Math.floor(Date.now() / 1000)
        && typeof googleProfile.sub === 'string'
        && googleProfile.sub.length > 0
        && emailIsVerified;
    const googleEmail = typeof googleProfile.email === 'string' ? googleProfile.email.trim().toLowerCase() : '';
    if (!tokenIsValid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googleEmail)) {
        return res.status(401).json({ message: 'Google account verification failed.' });
    }

    try {
        const user = await authService.findOrCreateGoogleUser({
            name: typeof googleProfile.name === 'string' ? googleProfile.name : googleEmail.split('@')[0],
            email: googleEmail,
        });
        return respondWithToken(user, res);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Google sign-in could not be completed.' });
    }
}