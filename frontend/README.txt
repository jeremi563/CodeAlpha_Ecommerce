NEXORA STORE FRONTEND

This frontend is a static HTML/CSS/JavaScript storefront served by the Express
backend in the sibling backend directory. All product, cart, order, auth, and
admin data is loaded from the backend API.

START THE APPLICATION
From the project root, run:
  cd backend
  npm install
  cp .env.example .env
  npm run dev

Then open:
  http://localhost:5000/

REQUIREMENTS
- PostgreSQL must be configured in backend/.env
- JWT_SECRET must be set in backend/.env
- The backend must be running before the UI can load live store data
- M-Pesa payment callbacks need a public HTTPS endpoint and credentials in the
  backend environment file

FRONTEND MODULES
Each page loads a matching script from js/:
  - home.js
  - products.js
  - product.js
  - cart.js
  - checkout.js
  - auth.js
  - orders.js
  - admin.js

Shared helpers live in js/api.js and js/site.js. The authenticated home page
redirects logged-in users to the product listing page so they cannot stay on the
landing screen while signed in.

This project does not keep a separate sample catalog in the browser; product data
comes from the database and the backend API.
