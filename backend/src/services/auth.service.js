import prisma from '../config/prisma.js';
import { comparePassword, hashPassword } from '../utils/password.js';

const publicUserFields = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
};

export async function registerUser({ name, email, password }) {
    const passwordHash = await hashPassword(password);

    return prisma.user.create({
        data: { name, email, passwordHash },
        select: publicUserFields,
    });
}

export async function authenticateUser(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.passwordHash))) return null;

    const { passwordHash, ...publicUser } = user;
    return publicUser;
}

export async function findOrCreateGoogleUser({ name, email }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim() || normalizedEmail.split('@')[0] || 'Google user';
    const randomPasswordHash = await hashPassword(`google-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

    const user = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { name: normalizedName },
        create: {
            name: normalizedName,
            email: normalizedEmail,
            passwordHash: randomPasswordHash,
        },
        select: publicUserFields,
    });

    return user;
}

export async function updateUserProfile(userId, { name, password }) {
    const updateData = {};

    if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (!trimmedName) throw new Error('name must be between 1 and 80 characters');
        updateData.name = trimmedName;
    }

    if (password !== undefined) {
        if (typeof password !== 'string' || !password.trim()) {
            throw new Error('Password must be 8-72 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
        }
        updateData.passwordHash = await hashPassword(password);
    }

    return prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: publicUserFields,
    });
}

export function getUserById(id) {
    return prisma.user.findUnique({
        where: { id },
        select: publicUserFields,
    });
}