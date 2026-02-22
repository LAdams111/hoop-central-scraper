# Deploy as a new service on Railway (HoopCentral project)

This app is ready for Railway: it uses `process.env.PORT` and has a `start` script.

## Add it as a new service in your HoopCentral project

### Option A: From the Railway dashboard (easiest)

1. **Push this repo to GitHub** (if you haven’t already):
   - Create a repo at https://github.com/new (e.g. `basketball-reference-scraper`)
   - Then in this folder:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/basketball-reference-scraper.git
     git push -u origin main
     ```

2. **Open your HoopCentral project** in Railway: https://railway.app/dashboard → select **hoopcentral**.

3. **Add a new service**:
   - Click **"+ New"** (or **"Add Service"**).
   - Choose **"GitHub Repo"** / **"Connect Repo"**.
   - Select the **basketball-reference-scraper** repository (the one you just pushed).
   - Confirm. Railway will create a new service in the same project and deploy it.

4. **Get the public URL**:
   - Open the new service → **Settings** → **Networking** → **Generate Domain** (or use an existing one).
   - Your API will be at `https://your-service-name.up.railway.app`. Use this as `baseUrl` in your frontend.

### Option B: Using Railway CLI

1. Install the CLI: https://docs.railway.com/develop/cli  
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. In this project folder, link to HoopCentral and create a service from this repo:
   ```bash
   cd "/Users/leoadams/Scraper Cursor"
   railway link
   ```
   When prompted, select your **hoopcentral** project.

3. Add a new service from the current code (deploys this directory):
   ```bash
   railway add
   ```
   Choose “Empty Service” or “GitHub Repo” depending on what Railway offers. If you use “Empty Service”, then:
   ```bash
   railway up
   ```
   to deploy the current code.

   If you instead connect a GitHub repo, push your code to that repo first; then in the dashboard, add a new service and connect that repo inside the HoopCentral project.

## After it’s deployed

- **Health check:** `https://YOUR-RAILWAY-URL/api/health`
- **Player:** `https://YOUR-RAILWAY-URL/api/player/jamesle01`
- **Team:** `https://YOUR-RAILWAY-URL/api/team/LAL/2025`

In your HoopCentral frontend, set the client base URL to the new service URL:

```javascript
getPlayerStats('jamesle01', { baseUrl: 'https://your-scraper-service.up.railway.app' });
getTeamStats('LAL', 2025, { baseUrl: 'https://your-scraper-service.up.railway.app' });
```

No extra environment variables are required unless you add features that need them later.
