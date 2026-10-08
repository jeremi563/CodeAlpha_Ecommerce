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

export function getUserById(id) {
    return prisma.user.findUnique({
        where: { id },
        select: publicUserFields,
    });
}