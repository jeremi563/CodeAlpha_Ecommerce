import * as authService from '../services/auth.service.js';
import { createToken } from '../utils/jwt.js';
import { loginSchema, parseBody, registerSchema } from '../utils/validators.js';

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