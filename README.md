# Nexora Store

Nexora Store is a full-stack e-commerce web application for browsing products, managing a cart, placing orders, and handling store administration. The app is served from the Express backend and uses PostgreSQL with Prisma for data persistence.

## Features

- User registration and login with JWT authentication
- Role-based access for customers and admins
- Public product catalog and product detail pages
- Database-backed product categories with storefront filters
- Cart management and checkout flow
- Order history for authenticated users
- Admin product management dashboard
- M-Pesa payment integration support in sandbox mode
- Authenticated users are redirected away from the home page to their dashboard
- Google sign-in with server-verified Google ID tokens

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js and Express
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT and bcrypt
- Payments: M-Pesa API integration

## Project structure

```text
CodeAlpha_Ecommerce/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── prisma/
│   ├── scripts/
│   └── src/
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── admin.html
│   ├── cart.html
│   ├── checkout.html
│   ├── index.html
│   ├── login.html
│   ├── orders.html
│   ├── product.html
│   ├── products.html
│   ├── register.html
│   └── README.txt
├── README.md
└── .git/
```

## Prerequisites

- Node.js 18 or newer
- PostgreSQL running locally or on a remote server
- A package manager such as npm

## Local setup

1. Clone the repository and go to the project folder:

```bash
git clone <your-repository-url>
cd CodeAlpha_Ecommerce
```

2. Configure the backend environment:

```bash
cd backend
cp .env.example .env
```

3. Edit the backend `.env` file and set these values:

```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nexora_store"
JWT_SECRET="replace-with-a-long-random-secret"
GOOGLE_CLIENT_ID="your-google-oauth-web-client-id"
MPESA_ENABLED=false
MPESA_ENVIRONMENT=sandbox
```

To enable Google sign-in, create an OAuth client of type **Web application** in Google Cloud Console. Add `http://localhost:5000` under **Authorized JavaScript origins** for local development, and add the exact HTTPS origin used by the deployed app before launch. Set the resulting client ID as `GOOGLE_CLIENT_ID` in `backend/.env` locally and in the deployment environment, then restart the server. No Google client secret belongs in the frontend or this application. Without this setting, email/password sign-in remains available.

4. Install dependencies and generate Prisma client:

```bash
cd backend
npm install
npx prisma generate
```

5. Apply the database schema:

```bash
npx prisma migrate dev --name init
```

6. Start the application:

```bash
npm run dev
```

The app will run at:

- Frontend/API base: http://localhost:5000
- Homepage: http://localhost:5000/
- Signed-in landing page: http://localhost:5000/dashboard.html

## Admin account

Create a default admin account before testing protected admin routes:

```bash
npm run seed:admin
```

## Product categories

Categories are stored in PostgreSQL and managed from the admin store desk. Existing products are assigned to `Uncategorized` by the category migration. Admins can add or rename categories, assign them to products, and delete categories after their products have been reassigned.

Public category and product endpoints:

- `GET /api/categories` lists active categories with active-product counts.
- `GET /api/products` lists active products and includes category details.
- `GET /api/products?category=electronics` filters products by category slug.
- `POST /api/categories`, `PATCH /api/categories/:id`, and `DELETE /api/categories/:id` are admin-only.

## Run tests

```bash
npm test
```

## Deployment notes

This project is ready for deployment once the environment variables are set in production and the database is reachable. The public app should serve the frontend through the backend server rather than opening static HTML files directly.

## License

This project is intended for educational and portfolio use within the CodeAlpha assignment scope.
