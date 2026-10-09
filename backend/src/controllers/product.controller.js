import * as productService from '../services/product.service.js';
import { parseBody, parseStringParam, productCreateSchema, productIdSchema, productUpdateSchema } from '../utils/validators.js';

function hasValidId(req, res) {
    const parsed = parseStringParam(productIdSchema, req.params.id, 'Product id must be a valid UUID');
    if (parsed.error) {
        res.status(400).json({ message: parsed.error });
        return false;
    }
    return true;
}

function readProductData(body, isUpdate = false) {
    const schema = isUpdate ? productUpdateSchema : productCreateSchema;
    const parsed = parseBody(schema, body, 'Request body must be a JSON object');
    if (parsed.error) return { error: parsed.error };

    if (!isUpdate && (!Object.hasOwn(parsed.data, 'name') || !Object.hasOwn(parsed.data, 'price'))) {
        return { error: 'name and price are required' };
    }

    return { data: parsed.data };
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