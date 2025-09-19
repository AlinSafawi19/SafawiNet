# 🖼️ Image Optimization Setup with Vercel Blob

This guide will help you set up Vercel Blob for optimal image performance in your Safawinet app.

## Prerequisites

- Vercel account (same as hosting)
- Vercel CLI installed
- Your project deployed to Vercel

## Step 1: Install Vercel Blob

### 1.1 Install Package
```bash
cd client
npm install @vercel/blob
```

### 1.2 Update package.json
Your `package.json` should include:
```json
{
  "dependencies": {
    "@vercel/blob": "^0.15.0"
  }
}
```

## Step 2: Configure Vercel Blob

### 2.1 Add Environment Variable
In your Vercel project dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `BLOB_READ_WRITE_TOKEN`
3. Get the token from Vercel Blob dashboard

### 2.2 Create Blob Storage
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Storage tab
4. Create new Blob store
5. Copy the `BLOB_READ_WRITE_TOKEN`

## Step 3: Upload Your Logo

### 3.1 Create Upload Script
Create `client/scripts/upload-logo.js`:
```javascript
const { put } = require('@vercel/blob');

async function uploadLogo() {
  try {
    await put('logo.png', file, {
      access: 'public',
    });
  } catch (error) {
  }
}

uploadLogo();
```

### 3.2 Upload via Vercel Dashboard
1. Go to your Vercel project dashboard
2. Navigate to Storage → Blob
3. Upload your logo.png file
4. Copy the generated URL

## Step 4: Update Your Components

### 4.1 Update Header Component
Update `client/app/components/Layout/Header.tsx`:
```tsx
import Image from 'next/image';

export default function Header() {
  return (
    <header className="header">
      <Image
        src="https://your-blob-url.vercel-storage.com/logo.png"
        alt="Safawinet Logo"
        width={200}
        height={100}
        priority
        className="logo"
      />
    </header>
  );
}
```

### 4.2 Update Other Components
Replace any hardcoded logo references with the Vercel Blob URL.

## Step 5: Optimize Images

### 5.1 Use Next.js Image Component
Always use Next.js `Image` component for automatic optimization:
```tsx
import Image from 'next/image';

<Image
  src="https://your-blob-url.vercel-storage.com/logo.png"
  alt="Safawinet Logo"
  width={200}
  height={100}
  priority={true} // For above-the-fold images
  quality={90} // 1-100, default is 75
  placeholder="blur" // Optional: add blur placeholder
/>
```

### 5.2 Responsive Images
For different screen sizes:
```tsx
<Image
  src="https://your-blob-url.vercel-storage.com/logo.png"
  alt="Safawinet Logo"
  width={200}
  height={100}
  sizes="(max-width: 768px) 150px, 200px"
  className="responsive-logo"
/>
```

## Step 6: Performance Benefits

### 6.1 What You Get
- ✅ **Automatic WebP/AVIF conversion** - 60-80% smaller files
- ✅ **Responsive images** - Different sizes for different devices
- ✅ **Lazy loading** - Images load only when needed
- ✅ **Global CDN** - Fast delivery worldwide
- ✅ **Edge caching** - Images cached at edge locations

### 6.2 Performance Metrics
- **File size reduction**: 60-80%
- **Loading speed**: 2-3x faster
- **Core Web Vitals**: Improved LCP and CLS scores
- **SEO**: Better Google PageSpeed scores

## Step 7: Multiple Image Sizes

### 7.1 Upload Different Sizes
Upload multiple versions of your logo:
- `logo-small.png` (100x50)
- `logo-medium.png` (200x100)
- `logo-large.png` (400x200)

### 7.2 Use Responsive Images
```tsx
<Image
  src="https://your-blob-url.vercel-storage.com/logo.png"
  alt="Safawinet Logo"
  width={200}
  height={100}
  sizes="(max-width: 640px) 100px, (max-width: 1024px) 200px, 400px"
  className="logo"
/>
```

## Step 8: Production Checklist

- [ ] Vercel Blob package installed
- [ ] Environment variable configured
- [ ] Logo uploaded to Vercel Blob
- [ ] Components updated with Blob URLs
- [ ] Images optimized with Next.js Image component
- [ ] Responsive images configured
- [ ] Performance tested

## Step 9: Monitoring

### 9.1 Vercel Analytics
- Enable in project settings
- Monitor Core Web Vitals
- Track image loading performance

### 9.2 Image Optimization
- Check file sizes in browser dev tools
- Verify WebP/AVIF conversion
- Test on different devices

## Troubleshooting

### Common Issues
1. **Images not loading**: Check Blob URL and permissions
2. **Slow loading**: Verify CDN configuration
3. **Build errors**: Ensure environment variables are set

### Debug Commands
```bash
# Check if Blob is working
vercel env pull

# Test image upload
node scripts/upload-logo.js
```

## Support

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Vercel Support](https://vercel.com/support)

---

**Result**: Your app will have lightning-fast image loading with automatic optimization and global CDN delivery!
