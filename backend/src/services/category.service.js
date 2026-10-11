import prisma from '../config/prisma.js';

export function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export function createCategory(data) {
  return prisma.category.create({ data });
}

export function updateCategory(id, data) {
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id) {
  const category = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!category) throw Object.assign(new Error('Category not found'), { code: 'P2025' });
  if (category.slug === 'uncategorized') throw new Error('DEFAULT_CATEGORY_PROTECTED');
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) throw new Error('CATEGORY_IN_USE');
  return prisma.category.delete({ where: { id } });
}

export async function getUncategorizedId() {
  const category = await prisma.category.findUnique({ where: { slug: 'uncategorized' }, select: { id: true } });
  if (!category) throw new Error('DEFAULT_CATEGORY_MISSING');
  return category.id;
}