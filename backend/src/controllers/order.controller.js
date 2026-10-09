import * as orderService from '../services/order.service.js';
import { orderIdSchema, orderStatusSchema, parseBody, parseStringParam } from '../utils/validators.js';

const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function validOrderId(req, res) {
    const parsed = parseStringParam(orderIdSchema, req.params.id, 'Order id must be a valid UUID');
    if (parsed.error) {
        res.status(400).json({ message: parsed.error });
        return false;
    }
    return true;
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

    const parsed = parseBody(orderStatusSchema, req.body);
    if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
    }

    try {
        const order = await orderService.updateOrderStatus(req.params.id, parsed.data.status);
        return res.json({ order });
    } catch (error) {
        return sendOrderError(error, res);
    }
}