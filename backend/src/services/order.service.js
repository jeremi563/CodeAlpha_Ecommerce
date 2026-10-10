import prisma from '../config/prisma.js';

const orderDetails = {
    items: true,
    payments: {
        select: {
            status: true,
            amount: true,
            mpesaReceiptNumber: true,
            updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
    },
};

export async function createOrder(userId, deliveryDetails) {
    return prisma.$transaction(async (transaction) => {
        const cartItems = await transaction.cartItem.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { id: 'asc' },
        });

        if (cartItems.length === 0) throw new Error('EMPTY_CART');

        let totalCents = 0;
        const orderItems = [];

        for (const cartItem of cartItems) {
            const product = cartItem.product;
            if (!product.isActive) throw new Error('PRODUCT_UNAVAILABLE');

            const unitPriceCents = Math.round(Number(product.price) * 100);
            const subtotalCents = unitPriceCents * cartItem.quantity;
            totalCents += subtotalCents;

            const stockUpdate = await transaction.product.updateMany({
                where: {
                    id: product.id,
                    isActive: true,
                    stock: { gte: cartItem.quantity },
                },
                data: { stock: { decrement: cartItem.quantity } },
            });

            if (stockUpdate.count !== 1) throw new Error('INSUFFICIENT_STOCK');

            orderItems.push({
                productId: product.id,
                productName: product.name,
                unitPrice: (unitPriceCents / 100).toFixed(2),
                quantity: cartItem.quantity,
                subtotal: (subtotalCents / 100).toFixed(2),
            });
        }

        const order = await transaction.order.create({
            data: {
                userId,
                total: (totalCents / 100).toFixed(2),
                ...deliveryDetails,
                items: { create: orderItems },
            },
            include: orderDetails,
        });

        await transaction.cartItem.deleteMany({ where: { userId } });
        return order;
    });
}

export function getUserOrders(userId) {
    return prisma.order.findMany({
        where: { userId },
        include: orderDetails,
        orderBy: { createdAt: 'desc' },
    });
}

export function getUserOrder(userId, orderId) {
    return prisma.order.findFirst({
        where: { id: orderId, userId },
        include: orderDetails,
    });
}

export function getAllOrders() {
    return prisma.order.findMany({
        include: {
            ...orderDetails,
            user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export function updateOrderStatus(orderId, status) {
    return prisma.order.update({ where: { id: orderId }, data: { status } });
}