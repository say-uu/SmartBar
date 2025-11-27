# Smart Bar

Full-stack app with a Cadet portal and Manager console.

## Stack

- Frontend: React + Vite + TailwindCSS
- Backend: Node.js/Express + MongoDB (Mongoose)

## Quick Start (dev)

1. Backend

   - Copy `.env.example` to `.env` and fill values (MongoDB, JWT secret)
   - Install and start:
     - `cd backend`
     - `npm install`
     - `npm run dev` (or `node server.js`)

2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Default API base URL on the frontend reads `VITE_API_BASE_URL`.

## Deploy/Build

- Frontend: `npm run build` (in `frontend`) outputs to `frontend/dist`
- Backend: Deploy Node/Express server with your `.env`

## License

Proprietary
