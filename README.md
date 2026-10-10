# Nexora Store

Nexora Store is a full-stack e-commerce web application for browsing products, managing a cart, placing orders, and handling store administration. The app is served from the Express backend and uses PostgreSQL with Prisma for data persistence.

## Features

- User registration and login with JWT authentication
- Role-based access for customers and admins
- Public product catalog and product detail pages
- Cart management and checkout flow
- Order history for authenticated users
- Admin product management dashboard
- M-Pesa payment integration support in sandbox mode
- Authenticated users are redirected away from the home page to the shop

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
MPESA_ENABLED=false
MPESA_ENVIRONMENT=sandbox
```

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

## Admin account

Create a default admin account before testing protected admin routes:

```bash
npm run seed:admin
```

## Run tests

```bash
npm test
```

## Deployment notes

This project is ready for deployment once the environment variables are set in production and the database is reachable. The public app should serve the frontend through the backend server rather than opening static HTML files directly.

## License

This project is intended for educational and portfolio use within the CodeAlpha assignment scope.
