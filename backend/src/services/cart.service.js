import prisma from '../config/prisma.js';

const cartItemDetails = {
    product: {
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            imageUrl: true,
            isActive: true,
        },
    },
};

export function getCart(userId) {
    return prisma.cartItem.findMany({
        where: { userId },
        include: cartItemDetails,
        orderBy: { id: 'asc' },
    });
}

export async function addItem(userId, productId, quantity) {
    return prisma.$transaction(async (transaction) => {
        const product = await transaction.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) throw new Error('PRODUCT_NOT_FOUND');

        const existingItem = await transaction.cartItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        const newQuantity = (existingItem?.quantity ?? 0) + quantity;
        if (newQuantity > product.stock) throw new Error('INSUFFICIENT_STOCK');

        if (existingItem) {
            return transaction.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity },
                include: cartItemDetails,
            });
        }

        return transaction.cartItem.create({
            data: { userId, productId, quantity },
            include: cartItemDetails,
        });
    });
}

export async function updateItem(userId, productId, quantity) {
    return prisma.$transaction(async (transaction) => {
        const product = await transaction.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) throw new Error('PRODUCT_NOT_FOUND');
        if (quantity > product.stock) throw new Error('INSUFFICIENT_STOCK');

        const existingItem = await transaction.cartItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (!existingItem) throw new Error('CART_ITEM_NOT_FOUND');

        return transaction.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity },
            include: cartItemDetails,
        });
    });
}

export async function removeItem(userId, productId) {
    const result = await prisma.cartItem.deleteMany({ where: { userId, productId } });
    return result.count > 0;
}

export function clearCart(userId) {
    return prisma.cartItem.deleteMany({ where: { userId } });
}