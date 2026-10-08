import jwt from 'jsonwebtoken';

export function createToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET must be configured');

    return jwt.sign(
        { role: user.role },
        secret,
        { subject: user.id, expiresIn: '7d' },
    );
}