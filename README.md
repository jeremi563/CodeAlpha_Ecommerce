<div align="center">

  # 🛒 <span style="background: linear-gradient(90deg, #8A2BE2, #00D2FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Nexora Store</span>

  **A sleek, robust, full-stack E-Commerce REST Application**

  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
  [![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

  ---

  <p align="center">
    <a href="# key-features">Key Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-api-reference">API Reference</a> •
    <a href="#-getting-started">Getting Started</a>
  </p>

</div>

---

## 🌟 Overview

**Nexora Store** is a lightweight yet powerful full-stack e-commerce platform built using Node.js, Express, PostgreSQL, and modern vanilla web technologies. Designed with performance, simplicity, and clean architecture in mind, it provides a complete end-to-end shopping experience—from product discovery and dynamic cart management to transactional checkout and order processing.

<br>

<div align="center">
  <img src="https://via.placeholder.com/800x400/0f0c20/ffffff?text=Nexora+Store+Preview+--+Gradient+Accent+#8A2BE2+to+#00D2FF" alt="Nexora Store Preview" width="100%" style="border-radius: 8px;">
</div>

---

## ✨ Key Features

- 👤 **User Authentication & RBAC**: JWT-based authentication with password hashing (`bcrypt`) supporting both Customer and Admin roles.
- 🛍️ **Product Catalog**: Dynamic product listings with detail views and stock availability status.
- 🛒 **Persistent Shopping Cart**: Backend-synchronized cart powered by PostgreSQL (no data loss across devices).
- ⚙️ **Transactional Order Processing**: Dynamic checkout pipeline executing stock adjustments and order item snapshots inside atomic SQL transactions.
- 🛡️ **Admin Management**: Dedicated endpoints for inventory management (CRUD products) and storewide order monitoring.

---

## 🛠 Tech Stack

<table>
  <tr>
    <td align="center" width="20%"><b>Layer</b></td>
    <td width="80%"><b>Technologies</b></td>
  </tr>
  <tr>
    <td align="center"><b>Frontend</b></td>
    <td>HTML5, Modern CSS3 (Variables & Gradients), Vanilla JavaScript (Fetch API)</td>
  </tr>
  <tr>
    <td align="center"><b>Backend</b></td>
    <td>Node.js, Express.js (MVC / Service Layer Pattern)</td>
  </tr>
  <tr>
    <td align="center"><b>Database & ORM</b></td>
    <td>PostgreSQL, Prisma ORM</td>
  </tr>
  <tr>
    <td align="center"><b>Security</b></td>
    <td>JSON Web Tokens (JWT), Bcrypt Password Hashing, CORS, Dotenv</td>
  </tr>
</table>

---

## 🏗 Architecture

The backend follows a strict **Layered Architecture** (Routes → Controllers → Services → Database) to ensure high maintainability and dynamic scalability.

```text
                     BROWSER (Frontend)
                             │
                             │ HTTP / REST
                             ▼
 ┌─────────────────────────────────────────────────────────┐
 │                     EXPRESS BACKEND                     │
 │  ┌────────────┐     ┌─────────────┐     ┌────────────┐  │
 │  │   Routes   │ ──► │ Controllers │ ──► │  Services  │  │
 │  └────────────┘     └─────────────┘     └─────┬──────┘  │
 └───────────────────────────────────────────────┼─────────┘
                                                 │
                                                 │ Prisma / SQL
                                                 ▼
 ┌─────────────────────────────────────────────────────────┐
 │                  POSTGRESQL DATABASE                    │
 │  [Users]   [Products]   [CartItems]   [Orders/Items]    │
 └─────────────────────────────────────────────────────────┘
```

---

## 🔌 API Reference

### 🔐 Authentication
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Authenticate user & get JWT | Public |
| `GET` | `/api/auth/me` | Fetch current user profile | Authenticated |

### 📦 Products
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Retrieve all products | Public |
| `GET` | `/api/products/:id` | Get specific product details | Public |
| `POST` | `/api/products` | Create product listing | Admin |
| `PATCH` | `/api/products/:id` | Update product details | Admin |
| `DELETE`| `/api/products/:id` | Remove a product | Admin |

### 🛒 Cart & Orders
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | View current user's cart | Authenticated |
| `POST` | `/api/cart` | Add item to cart | Authenticated |
| `POST` | `/api/orders` | Checkout & place an order | Authenticated |
| `GET` | `/api/orders` | View user order history | Authenticated |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/) database installed and running

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/CodeAlpha_Ecommerce.git
   cd CodeAlpha_Ecommerce
   ```

2. **Configure Backend Environment**
   Navigate to the backend directory and set up environment variables:
   ```bash
   cd backend
   cp .env.example .env
   ```
   *Update `.env` with your PostgreSQL connection string and a secret key for JWT.*

3. **Install Dependencies & Run Migrations**
   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```

5. **Launch Frontend**
   Open `frontend/index.html` in your browser or run a simple local web server (e.g., Live Server extension).

---

<div align="center">

  <sub>Crafted with precision for CodeAlpha Full Stack Engineering Task.</sub>

</div>