import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ message: 'Authentication is not configured' });

    const authorization = req.get('Authorization') ?? '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) return res.status(401).json({ message: 'A Bearer token is required' });

    try {
        const user = jwt.verify(match[1], secret);
        if (typeof user !== 'object' || typeof user.sub !== 'string') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = user;
        return next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}