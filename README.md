# ConvoHub | Real-Time Messaging Application

ConvoHub is a real-time web chat application featuring instant direct messaging, live typing indicators, online/offline user presence tracking, and message delivery/read receipts. 

It is built as a monorepo with an Express/Node.js backend (using Socket.io and Mongoose/MongoDB) and a React/Vite frontend (styled with Tailwind CSS and custom glassmorphism components).

---

## Screenshots

### Login Page
![Login Page](screenshots/login.png)

### Chat Dashboard
![Chat Dashboard](screenshots/chat.png)

---

## Features

### 🌟 Core Features
*   **Real-time Messaging:** Messages are sent and received instantly via WebSockets (`socket.io`).
*   **Stunning Modern UI:** Premium glassmorphism aesthetics, responsive layouts, tailored dark mode color palettes, custom gradients, and micro-animations.
*   **Persistent History:** All direct message histories are stored and fetched from a MongoDB database.

### 🚀 Bonus Features (Fully Implemented)
*   **Username-Based Login:** Simple dummy authentication. Users log in using only a unique username.
*   **Online/Offline User Status:** Interactive sidebar displaying the active/inactive status of all users with real-time indicators.
*   **Live Typing Indicator:** Shows when a chat partner is typing.
*   **Message Delivery & Read Receipts:** 
    *   **Single Check (`✓`):** Sent to the server, receiver is offline.
    *   **Double Gray Check (`✓✓`):** Delivered (receiver is online).
    *   **Double Blue Check (`✓✓`):** Message read by the receiver.

---

## Project Structure

```text
web_chat/
├── backend/               # Node.js + Express API & Socket.io server
│   ├── src/
│   │   ├── controllers/   # Message APIs
│   │   ├── models/        # Mongoose Schema (Message)
│   │   ├── routes/        # Express Routes
│   │   ├── sockets/       # Socket.io connection & event handlers
│   │   ├── app.js         # Express app initialization
│   │   └── server.js      # Server entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/              # React + Vite Client
│   ├── src/
│   │   ├── api/           # Axios client configurations
│   │   ├── context/       # ChatContext for WebSocket state & messaging handlers
│   │   ├── pages/         # Login and Chat dashboard pages
│   │   └── index.css      # Styling configurations & Tailwind directives
│   ├── index.html
│   └── package.json
└── README.md              # Project documentation (this file)
```

---

## Prerequisites

Before running the application, make sure you have:
*   [Node.js](https://nodejs.org/) (v16+ recommended)
*   [MongoDB](https://www.mongodb.com/) (Local instance running at `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI)

---

## Environment Variables Required

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory (or duplicate `backend/.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/web_chat
CLIENT_URL=http://localhost:5173
```

*   `PORT`: The port the backend server listens on (default: `5000`).
*   `MONGODB_URI`: The MongoDB connection string.
*   `CLIENT_URL`: The origin of the frontend client (for CORS configuration).

### Frontend

By default, the frontend is configured to connect to the backend at `http://localhost:5000` via [messageApi.js](file:///d:/my_coding_work/web_chat/frontend/src/api/messageApi.js) and [socketService.js](file:///d:/my_coding_work/web_chat/frontend/src/socket/socketService.js).

---

## Project Setup & Running

### 1. Backend Setup & Run

1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables inside a `.env` file (see [Environment Variables Required](#environment-variables-required)).
4.  Start the development server:
    ```bash
    npm run dev
    ```
    The server will start running at `http://localhost:5000`.

### 2. Frontend Setup & Run

1.  Navigate to the `frontend/` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The web app will start running locally, typically at `http://localhost:5173` (or `http://localhost:5174`). Open the URL in multiple browser windows or private/incognito tabs to test real-time chat between different users!

---

## Design Decisions

1.  **Monorepo Structure with Separated Concerns:** Keeping `backend` and `frontend` separate allows independent hosting, simple dependency trees, and clean service definitions.
2.  **Context-Driven React State:** A custom `ChatContext` wraps the application. This encapsulates all Socket.io listeners, state updates (typing, online status, messaging lists), and backend API queries in a clean, reusable interface, freeing the UI components from state complexity.
3.  **Dynamic Socket Room / Direct Addressing:** Socket.io events are mapped to unique users dynamically using a `userSocketMap`. Instead of relying on rigid, pre-defined chatrooms, direct messages are targeted using specific socket IDs mapped to registered usernames, allowing multi-device/multi-tab synchronization.
4.  **Tailored Glassmorphism & Custom Palettes:** Used Tailwind CSS combined with backdrop filters (`backdrop-blur-md`), dark backgrounds (`#0f172a`), and rich gradients (from blue to indigo) to give a modern, premium feel.

---

## Assumptions Made

1.  **Unique Usernames:** The login mechanism assumes username uniqueness is managed loosely. Since this is dummy authentication, registering with an existing username allows you to session-in as that user (useful for local testing and debugging).
2.  **Stateless Online Tracking:** Online users are determined by active Socket.io connections. When a user disconnects all their sockets (closes all tabs), they are immediately marked offline.
3.  **Unread Messages Count:** Unread counts are computed based on messages where `read: false` and the current user is the `receiver`. Upon selecting the conversation, the client emits a `messageRead` event to update the records in the database.
4.  **Local Storage Cache:** The logged-in username is stored in local storage to keep the session active upon refreshing.
