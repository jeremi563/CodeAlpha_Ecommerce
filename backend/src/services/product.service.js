import prisma from '../config/prisma.js';

export function getProducts() {
    return prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
    });
}

export function getProductById(id) {
    return prisma.product.findUnique({ where: { id } });
}

export function createProduct(data) {
    return prisma.product.create({ data });
}

export function updateProduct(id, data) {
    return prisma.product.update({ where: { id }, data });
}

export function deleteProduct(id) {
    return prisma.product.delete({ where: { id } });
}