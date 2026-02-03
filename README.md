# Neurosurgery Learning App

A web-based application for studying and reviewing neurosurgical procedures with step-by-step guides.

## Features

- **Procedure Library**: Comprehensive collection of neurosurgical procedures
- **Step-by-Step Viewer**: Navigate through procedure steps with tips and warnings
- **Search & Filter**: Find procedures by name or category
- **Add/Edit Procedures**: Customize your learning content
- **Keyboard Navigation**: Use arrow keys to navigate steps

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Deployment Options

### Deploy to Railway (Recommended)
1. Push to GitHub
2. Connect to Railway.app
3. Deploy automatically

### Deploy to Render
1. Push to GitHub
2. Create new Web Service on render.com
3. Connect repository

### Deploy to Heroku
```bash
heroku create your-app-name
git push heroku main
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Database**: JSON file storage (data.json)

## API Endpoints

- `GET /api/procedures` - List all procedures
- `GET /api/procedures/:id` - Get procedure with steps
- `POST /api/procedures` - Create procedure
- `PUT /api/procedures/:id` - Update procedure
- `DELETE /api/procedures/:id` - Delete procedure
- `GET /api/categories` - List categories

## License

MIT
