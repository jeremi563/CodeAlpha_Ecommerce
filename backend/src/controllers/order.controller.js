import * as orderService from '../services/order.service.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function validOrderId(req, res) {
    if (uuidPattern.test(req.params.id)) return true;
    res.status(400).json({ message: 'Order id must be a valid UUID' });
    return false;
}

function sendOrderError(error, res) {
    if (error.message === 'EMPTY_CART') return res.status(400).json({ message: 'Your cart is empty' });
    if (error.message === 'PRODUCT_UNAVAILABLE') {
        return res.status(409).json({ message: 'A product in your cart is no longer available' });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
        return res.status(409).json({ message: 'A product in your cart has insufficient stock' });
    }
    if (error.code === 'P2025') return res.status(404).json({ message: 'Order not found' });

    console.error(error);
    return res.status(500).json({ message: 'Could not complete order request' });
}

export async function createOrder(req, res) {
    try {
        const order = await orderService.createOrder(req.user.sub);
        return res.status(201).json({ order });
    } catch (error) {
        return sendOrderError(error, res);
    }
}

export async function listUserOrders(req, res) {
    try {
        const orders = await orderService.getUserOrders(req.user.sub);
        return res.json({ orders });
    } catch (error) {
        return sendOrderError(error, res);
    }
}

export async function getUserOrder(req, res) {
    if (!validOrderId(req, res)) return;

    try {
        const order = await orderService.getUserOrder(req.user.sub, req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        return res.json({ order });
    } catch (error) {
        return sendOrderError(error, res);
    }
}

export async function listAllOrders(req, res) {
    try {
        const orders = await orderService.getAllOrders();
        return res.json({ orders });
    } catch (error) {
        return sendOrderError(error, res);
    }
}

export async function updateOrderStatus(req, res) {
    if (!validOrderId(req, res)) return;
    if (!req.body || typeof req.body.status !== 'string' || !orderStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: `status must be one of: ${orderStatuses.join(', ')}` });
    }

    try {
        const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
        return res.json({ order });
    } catch (error) {
        return sendOrderError(error, res);
    }
}