import * as authService from '../services/auth.service.js';
import { createToken } from '../utils/jwt.js';

function readCredentials(body, isRegistration = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: 'Request body must be a JSON object' };
    }

    const { name, email, password } = body;
    if (typeof email !== 'string' || typeof password !== 'string') {
        return { error: 'email and password are required' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { error: 'email must be a valid email address' };
    }

    if (isRegistration) {
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
            return { error: 'name must be between 1 and 80 characters' };
        }
        if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return { error: 'password must be at least 8 characters and no more than 72 bytes' };
        }
    } else if (!password) {
        return { error: 'email and password are required' };
    }

    return {
        credentials: {
            name: isRegistration ? name.trim() : undefined,
            email: normalizedEmail,
            password,
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