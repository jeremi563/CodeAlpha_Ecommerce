import prisma from '../config/prisma.js';

export function getProducts(categorySlug) {
    return prisma.product.findMany({
        where: {
            isActive: true,
            ...(categorySlug ? { category: { slug: categorySlug, isActive: true } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { category: true },
    });
}

export function getProductById(id) {
    return prisma.product.findUnique({ where: { id }, include: { category: true } });
}

export function createProduct(data) {
    return prisma.product.create({ data, include: { category: true } });
}

export function updateProduct(id, data) {
    return prisma.product.update({ where: { id }, data, include: { category: true } });
}

export function deleteProduct(id) {
    return prisma.product.delete({ where: { id } });
}