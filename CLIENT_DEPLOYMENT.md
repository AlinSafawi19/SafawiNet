# 🚀 Production Deployment Guide

This guide will help you deploy your Safawinet frontend to Vercel for production.

## Prerequisites

- GitHub account
- Vercel account (free at [vercel.com](https://vercel.com))
- Your code pushed to GitHub

## Step 1: Prepare Your Repository

### 1.1 Push to GitHub
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit for production deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/safawinet.git

# Push to GitHub
git push -u origin main
```

### 1.2 Verify Package.json
Ensure your `client/package.json` has the correct build script:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  }
}
```

## Step 2: Deploy to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Authorize Vercel to access your repositories

### 2.2 Import Project
1. Click "New Project" in Vercel dashboard
2. Select "Import Git Repository"
3. Choose your `safawinet` repository
4. Vercel will auto-detect it's a Next.js project

### 2.3 Configure Project Settings
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `client` (since your Next.js app is in the client folder)
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `.next` (auto-filled)
- **Install Command**: `npm install` (auto-filled)

### 2.4 Environment Variables
Add your environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from your `env.dev` file:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_WS_URL`
   - Any other environment variables

### 2.5 Deploy
1. Click "Deploy" button
2. Wait for build to complete (usually 2-3 minutes)
3. Your app will be live at `https://your-project-name.vercel.app`

## Step 3: Custom Domain (Optional)

### 3.1 Add Custom Domain
1. Go to Project Settings → Domains
2. Add your domain (e.g., `safawinet.com`)
3. Follow Vercel's DNS configuration instructions

### 3.2 Configure DNS
Update your domain's DNS settings:
- Add CNAME record pointing to Vercel
- Or use Vercel's nameservers

## Step 4: Production Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and deployed
- [ ] Environment variables configured
- [ ] Custom domain added (if applicable)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] App accessible at production URL

## Step 5: Continuous Deployment

Once set up, every push to your main branch will automatically:
1. Trigger a new build
2. Deploy to production
3. Update your live site

## Troubleshooting

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### Performance Issues
- Enable Vercel Analytics in project settings
- Check Core Web Vitals in Vercel dashboard
- Optimize images using Vercel Blob (see IMAGE_SETUP.md)

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Support](https://vercel.com/support)

---

**Next Step**: Set up Vercel Blob for image optimization (see IMAGE_SETUP.md)
