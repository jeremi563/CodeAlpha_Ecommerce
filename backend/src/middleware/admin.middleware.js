import jwt from 'jsonwebtoken';

export default function requireAdmin(req, res, next) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ message: 'Authentication is not configured' });

    const authorization = req.get('Authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'A Bearer token is required' });
    }

    try {
        const user = jwt.verify(token, secret);
        if (user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
}