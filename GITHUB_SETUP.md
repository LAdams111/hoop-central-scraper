# Push this project to GitHub

Your code is committed locally. To create a new repository on GitHub and push:

## 1. Create the repo on GitHub

1. Go to **https://github.com/new**
2. Set **Repository name** (e.g. `basketball-reference-scraper`)
3. Choose **Public**
4. **Do not** check "Add a README" or ".gitignore" (you already have them)
5. Click **Create repository**

## 2. Add the remote and push

Replace `YOUR_USERNAME` with your GitHub username and `REPO_NAME` with the repo name you chose:

```bash
cd "/Users/leoadams/Scraper Cursor"

git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

If you use SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

After this, the project will appear on GitHub at `https://github.com/YOUR_USERNAME/REPO_NAME`.
