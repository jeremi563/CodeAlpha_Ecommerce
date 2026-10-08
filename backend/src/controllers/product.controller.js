import * as productService from '../services/product.service.js';

const editableFields = ['name', 'description', 'price', 'stock', 'imageUrl', 'isActive'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasValidId(req, res) {
    if (uuidPattern.test(req.params.id)) return true;
    res.status(400).json({ message: 'Product id must be a valid UUID' });
    return false;
}

function readProductData(body, isUpdate = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: 'Request body must be a JSON object' };
    }

    const data = {};
    for (const field of editableFields) {
        if (Object.hasOwn(body, field)) data[field] = body[field];
    }

    if (!isUpdate && (!Object.hasOwn(data, 'name') || !Object.hasOwn(data, 'price'))) {
        return { error: 'name and price are required' };
    }

    if (Object.keys(data).length === 0) {
        return { error: 'Provide at least one product field to update' };
    }

    if (Object.hasOwn(data, 'name') && (typeof data.name !== 'string' || !data.name.trim())) {
        return { error: 'name must be a non-empty string' };
    }

    if (Object.hasOwn(data, 'description') && data.description !== null && typeof data.description !== 'string') {
        return { error: 'description must be a string or null' };
    }

    if (Object.hasOwn(data, 'imageUrl') && data.imageUrl !== null && typeof data.imageUrl !== 'string') {
        return { error: 'imageUrl must be a string or null' };
    }

    if (Object.hasOwn(data, 'price')) {
        const price = Number(data.price);
        if (!Number.isFinite(price) || price < 0) return { error: 'price must be a non-negative number' };
        data.price = price;
    }

    if (Object.hasOwn(data, 'stock') && (!Number.isInteger(data.stock) || data.stock < 0)) {
        return { error: 'stock must be a non-negative integer' };
    }

    if (Object.hasOwn(data, 'isActive') && typeof data.isActive !== 'boolean') {
        return { error: 'isActive must be a boolean' };
    }

    if (Object.hasOwn(data, 'name')) data.name = data.name.trim();
    if (Object.hasOwn(data, 'description') && typeof data.description === 'string') data.description = data.description.trim();
    if (Object.hasOwn(data, 'imageUrl') && typeof data.imageUrl === 'string') data.imageUrl = data.imageUrl.trim();

    return { data };
}

function sendDatabaseError(error, res) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Product not found' });
    console.error(error);
    return res.status(500).json({ message: 'Could not complete product request' });
}

export async function listProducts(req, res) {
    try {
        const products = await productService.getProducts();
        res.json(products);
    } catch (error) {
        sendDatabaseError(error, res);
    }
}

export async function getProduct(req, res) {
    if (!hasValidId(req, res)) return;

    try {
        const product = await productService.getProductById(req.params.id);
        if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        sendDatabaseError(error, res);
    }
}

export async function createProduct(req, res) {
    const { data, error } = readProductData(req.body);
    if (error) return res.status(400).json({ message: error });

    try {
        const product = await productService.createProduct(data);
        res.status(201).json(product);
    } catch (databaseError) {
        sendDatabaseError(databaseError, res);
    }
}

export async function updateProduct(req, res) {
    if (!hasValidId(req, res)) return;

    const { data, error } = readProductData(req.body, true);
    if (error) return res.status(400).json({ message: error });

    try {
        const product = await productService.updateProduct(req.params.id, data);
        res.json(product);
    } catch (databaseError) {
        sendDatabaseError(databaseError, res);
    }
}

export async function deleteProduct(req, res) {
    if (!hasValidId(req, res)) return;

    try {
        await productService.deleteProduct(req.params.id);
        res.status(204).end();
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(409).json({ message: 'Product is used by an order and cannot be deleted' });
        }
        sendDatabaseError(error, res);
    }
}