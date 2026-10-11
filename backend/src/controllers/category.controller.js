import { z } from 'zod';
import * as categoryService from '../services/category.service.js';
import { categorySlug } from '../utils/category.js';
import { parseBody, parseStringParam, uuidSchema } from '../utils/validators.js';

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(60, 'Category name must be 60 characters or fewer'),
}).passthrough();
const categoryUpdateSchema = categoryCreateSchema;

function sendCategoryError(error, res) {
  if (error.code === 'P2002') return res.status(409).json({ message: 'A category with this name already exists' });
  if (error.code === 'P2003') return res.status(409).json({ message: 'Reassign this category’s products before deleting it' });
  if (error.code === 'P2025') return res.status(404).json({ message: 'Category not found' });
  if (error.message === 'CATEGORY_IN_USE') return res.status(409).json({ message: 'Reassign this category’s products before deleting it' });
  if (error.message === 'DEFAULT_CATEGORY_PROTECTED') return res.status(409).json({ message: 'The default category cannot be deleted' });
  if (error.message === 'INVALID_CATEGORY_SLUG') return res.status(400).json({ message: 'Category name must include at least one letter or number' });
  console.error(error);
  return res.status(500).json({ message: 'Could not complete category request' });
}

function readCategoryData(body, isUpdate = false) {
  const parsed = parseBody(isUpdate ? categoryUpdateSchema : categoryCreateSchema, body);
  if (parsed.error) return { error: parsed.error };
  const slug = categorySlug(parsed.data.name);
  if (!slug) return { error: 'Category name must include at least one letter or number' };
  return { data: { name: parsed.data.name, slug } };
}

export async function listCategories(req, res) {
  try {
    const categories = await categoryService.listCategories();
    return res.json(categories);
  } catch (error) {
    return sendCategoryError(error, res);
  }
}

export async function createCategory(req, res) {
  const { data, error } = readCategoryData(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    return res.status(201).json(await categoryService.createCategory(data));
  } catch (databaseError) {
    return sendCategoryError(databaseError, res);
  }
}

export async function updateCategory(req, res) {
  const parsedId = parseStringParam(uuidSchema, req.params.id, 'Category id must be a valid UUID');
  if (parsedId.error) return res.status(400).json({ message: parsedId.error });
  const { data, error } = readCategoryData(req.body, true);
  if (error) return res.status(400).json({ message: error });
  try {
    return res.json(await categoryService.updateCategory(parsedId.data, data));
  } catch (databaseError) {
    return sendCategoryError(databaseError, res);
  }
}

export async function deleteCategory(req, res) {
  const parsedId = parseStringParam(uuidSchema, req.params.id, 'Category id must be a valid UUID');
  if (parsedId.error) return res.status(400).json({ message: parsedId.error });
  try {
    await categoryService.deleteCategory(parsedId.data);
    return res.status(204).end();
  } catch (error) {
    return sendCategoryError(error, res);
  }
}