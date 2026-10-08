import * as cartService from '../services/cart.service.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validProductId(req, res) {
    if (uuidPattern.test(req.params.productId)) return true;
    res.status(400).json({ message: 'Product id must be a valid UUID' });
    return false;
}

function readQuantity(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: 'Request body must be a JSON object' };
    }
    if (!Number.isInteger(body.quantity) || body.quantity < 1) {
        return { error: 'quantity must be a positive integer' };
    }
    return { quantity: body.quantity };
}

function sendCartError(error, res) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({ message: 'Active product not found' });
    }
    if (error.message === 'CART_ITEM_NOT_FOUND') {
        return res.status(404).json({ message: 'Product is not in your cart' });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
        return res.status(409).json({ message: 'Requested quantity exceeds available stock' });
    }
    if (error.code === 'P2002') {
        return res.status(409).json({ message: 'This product is already being added to your cart; retry the request' });
    }

    console.error(error);
    return res.status(500).json({ message: 'Could not complete cart request' });
}

export async function getCart(req, res) {
    try {
        const items = await cartService.getCart(req.user.sub);
        const totalCents = items.reduce((sum, item) => {
            return sum + Math.round(Number(item.product.price) * 100) * item.quantity;
        }, 0);
        return res.json({ items, total: totalCents / 100 });
    } catch (error) {
        return sendCartError(error, res);
    }
}

export async function addItem(req, res) {
    const { quantity, error } = readQuantity(req.body);
    if (error) return res.status(400).json({ message: error });
    if (typeof req.body.productId !== 'string' || !uuidPattern.test(req.body.productId)) {
        return res.status(400).json({ message: 'productId must be a valid UUID' });
    }

    try {
        const item = await cartService.addItem(req.user.sub, req.body.productId, quantity);
        return res.status(200).json({ item });
    } catch (error) {
        return sendCartError(error, res);
    }
}

export async function updateItem(req, res) {
    if (!validProductId(req, res)) return;
    const { quantity, error } = readQuantity(req.body);
    if (error) return res.status(400).json({ message: error });

    try {
        const item = await cartService.updateItem(req.user.sub, req.params.productId, quantity);
        return res.json({ item });
    } catch (error) {
        return sendCartError(error, res);
    }
}

export async function removeItem(req, res) {
    if (!validProductId(req, res)) return;

    try {
        const removed = await cartService.removeItem(req.user.sub, req.params.productId);
        if (!removed) return res.status(404).json({ message: 'Product is not in your cart' });
        return res.status(204).end();
    } catch (error) {
        return sendCartError(error, res);
    }
}

export async function clearCart(req, res) {
    try {
        await cartService.clearCart(req.user.sub);
        return res.status(204).end();
    } catch (error) {
        return sendCartError(error, res);
    }
}