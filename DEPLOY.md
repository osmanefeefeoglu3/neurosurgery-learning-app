# Deployment Guide for Neurosurgery Learning App

## Option 1: Deploy to Railway (Easiest)

### Step 1: Install Git (one-time)
Open Terminal and run:
```bash
xcode-select --install
```
Click "Install" when prompted.

### Step 2: Create GitHub Account
1. Go to https://github.com
2. Sign up for a free account

### Step 3: Create GitHub Repository
1. Go to https://github.com/new
2. Name it: `neurosurgery-learning-app`
3. Keep it Public
4. Click "Create repository"

### Step 4: Push Your Code
Open Terminal and run these commands:
```bash
cd "/Users/osmanefeoglu/Desktop/neurosurgical books/NRŞ KİTAP/my-neurosurgery-app"

git init
git add .
git commit -m "Initial commit - Neurosurgery Learning App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/neurosurgery-learning-app.git
git push -u origin main
```

### Step 5: Deploy on Railway
1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select `neurosurgery-learning-app`
6. Railway will auto-detect Node.js and deploy!
7. Click "Generate Domain" to get your public URL

Your app will be live at: `https://your-app-name.up.railway.app`

---

## Option 2: Deploy to Render

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - Name: neurosurgery-learning-app
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Click "Create Web Service"

---

## Option 3: Quick Local Network Sharing

To share on your local network temporarily:

1. Find your IP address:
```bash
ipconfig getifaddr en0
```

2. Start the server:
```bash
cd "/Users/osmanefeoglu/Desktop/neurosurgical books/NRŞ KİTAP/my-neurosurgery-app"
npm start
```

3. Access from other devices on same WiFi:
`http://YOUR_IP_ADDRESS:3000`

---

## Troubleshooting

### "Command not found: git"
Run: `xcode-select --install`

### "Permission denied"
Run: `chmod -R 755 .`

### Port already in use
Kill existing process: `lsof -ti:3000 | xargs kill -9`
