# Quiz Ripple 🧠✨

Quiz Ripple is a full-stack MERN (MongoDB, Express, React, Node.js) web application that provides an interactive and secure quiz-taking platform. Users can register, log in, attempt quizzes, view their results, and manage their profiles through a responsive web interface.

🔗 **Live Application:** https://quizripple.vercel.app

---

## 📌 Project Overview

Quiz Ripple is designed to simulate a real-world online quiz system with a clean separation between frontend and backend. The application follows a client–server architecture, ensuring scalability, security, and maintainability.

The frontend is responsible for user interaction and presentation, while the backend handles authentication, business logic, and persistent data storage.

---

## 🏗️ System Architecture


---

## ✨ Key Features

### 🔐 Authentication & Security
- Secure user registration and login
- Password hashing and validation
- JWT-based authentication
- Protected API routes using middleware

### 📝 Quiz Functionality
- Dynamic quiz questions served from backend
- User quiz attempts stored in database
- Score calculation and persistence

### 📊 Results Tracking
- View past quiz attempts
- User-specific result storage
- Scalable schema for analytics

### 👤 User Profile Management
- Secure profile retrieval
- Auth-protected profile endpoints

### 🌐 Production Ready
- Environment-based configuration
- CORS-secured frontend–backend communication
- Independent frontend and backend deployments

---

## 🛠️ Tech Stack

### Frontend
- React
- Axios
- CSS
- React Router

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- CORS

### Deployment
- Frontend: **Vercel**
- Backend: **Render**
- Database: **MongoDB Atlas**

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env

CLIENT_ORIGIN=https://quizripple.vercel.app

