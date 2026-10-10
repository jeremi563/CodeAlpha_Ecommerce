NEXORA STORE FRONTEND

This frontend uses plain HTML, CSS, and JavaScript modules. It is served by the
Express application in the sibling backend directory and uses the backend API
for products, accounts, carts, orders, and M-Pesa payment requests.

START THE APPLICATION
From the repository root, run:
  cd backend
  npm start
Then open http://localhost:5000.

The backend requires a configured PostgreSQL DATABASE_URL and JWT_SECRET in
backend/.env. Set up an admin account with the backend seed:admin script.
Safaricom callback confirmation requires a public HTTPS callback URL and the
M-Pesa credentials and callback token described in backend/.env.example.

FRONTEND MODULES
Each page loads its matching module from js/: home, products, product, cart,
checkout, auth, orders, or admin. Shared API and navigation helpers live in
js/api.js and js/site.js. Product and order data shown in the storefront comes
from the database; the browser does not maintain a separate sample catalog.

Product upload previews accept images up to 5 MB. Product image data is sent to
the product API, which accepts requests up to 8 MB. Other JSON API requests use
a smaller request-size limit.
