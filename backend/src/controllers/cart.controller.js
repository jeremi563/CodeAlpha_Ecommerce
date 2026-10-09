import * as cartService from '../services/cart.service.js';
import { cartItemSchema, cartQuantitySchema, parseBody, parseStringParam, productIdSchema } from '../utils/validators.js';

function validProductId(req, res) {
    const parsed = parseStringParam(productIdSchema, req.params.productId, 'Product id must be a valid UUID');
    if (parsed.error) {
        res.status(400).json({ message: parsed.error });
        return false;
    }
    return true;
}

function readQuantity(body) {
    const parsed = parseBody(cartQuantitySchema, body);
    if (parsed.error) return { error: parsed.error };
    return { quantity: parsed.data.quantity };
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
    const parsed = parseBody(cartItemSchema, req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    try {
        const item = await cartService.addItem(req.user.sub, parsed.data.productId, parsed.data.quantity);
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