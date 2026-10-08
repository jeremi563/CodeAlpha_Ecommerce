import requireAuth from './auth.middleware.js';

export default function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
        next();
    });
}