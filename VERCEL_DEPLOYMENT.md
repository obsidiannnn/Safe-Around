# SafeAround - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **Database**: Your Supabase PostgreSQL database (already configured)
4. **Redis**: Your Upstash Redis instance (already configured)

## Backend Deployment Steps

### 1. Login to Vercel
```bash
vercel login
```

### 2. Deploy Backend API

Navigate to the project root and run:
```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No
- **Project name?** → safearound-backend
- **Directory?** → ./
- **Override settings?** → No

### 3. Configure Environment Variables

After initial deployment, add environment variables via Vercel Dashboard or CLI:

```bash
# Database Configuration (Supabase)
vercel env add DB_HOST
# Value: aws-1-ap-south-1.pooler.supabase.com

vercel env add DB_PORT
# Value: 5432

vercel env add DB_USER
# Value: postgres.rmomkbyxnsmbdiocqsgk

vercel env add DB_PASSWORD
# Value: SafeAround,2026

vercel env add DB_NAME
# Value: postgres

vercel env add DB_SSLMODE
# Value: require

vercel env add SUPABASE_URL
# Value: https://rmomkbyxnsmbdiocqsgk.supabase.co

vercel env add SUPABASE_PUBLISHABLE_KEY
# Value: sb_publishable_7dppdsaS63KP7V4-UGBwgQ_HJgzy65L

# Redis Configuration (Upstash)
vercel env add REDIS_URL
# Value: rediss://default:gQAAAAAAARfEAAIncDE0YzFjNmFlNzI5Nzg0OTI5YTNiZmQ3NTZhZmI3MDNjNHAxNzE2MjA@allowed-lobster-71620.upstash.io:6379

vercel env add REDIS_DB
# Value: 0

vercel env add REDIS_POOL_SIZE
# Value: 10

# JWT Configuration
vercel env add JWT_SECRET
# Value: your-super-secret-jwt-key-change-this-in-production

vercel env add JWT_EXPIRY
# Value: 168h

vercel env add JWT_REFRESH_EXPIRY
# Value: 720h

# External APIs
vercel env add GOOGLE_MAPS_API_KEY
# Value: AIzaSyBfi1CO-cAF0aJBxktzJLQYwq2IuzqXVMY

vercel env add TWILIO_ACCOUNT_SID
# Value: ACf8462f33403c041232268266ebb90389

vercel env add TWILIO_AUTH_TOKEN
# Value: 33adb9af02aa77c32c6efd72878b6fc1

vercel env add TWILIO_PHONE_NUMBER
# Value: +919119759509

vercel env add FCM_SERVER_KEY
# Value: your_fcm_server_key

# App Configuration
vercel env add API_VERSION
# Value: v1

vercel env add ALLOWED_ORIGINS
# Value: *

vercel env add MAX_UPLOAD_SIZE
# Value: 10485760

# Logging
vercel env add LOG_LEVEL
# Value: info

vercel env add LOG_FORMAT
# Value: json

# Server Configuration
vercel env add GIN_MODE
# Value: release

vercel env add ENVIRONMENT
# Value: production
```

### 4. Redeploy with Environment Variables
```bash
vercel --prod
```

### 5. Get Your Deployment URL

After deployment, Vercel will provide a URL like:
```
https://safearound-backend-xxxxx.vercel.app
```

## Frontend Configuration

### Update Frontend Environment Variables

1. Edit `frontend/.env.production`:
```env
API_URL=https://your-vercel-backend-url.vercel.app/api/v1
WS_URL=wss://your-vercel-backend-url.vercel.app
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBfi1CO-cAF0aJBxktzJLQYwq2IuzqXVMY
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

2. Replace `your-vercel-backend-url.vercel.app` with your actual Vercel deployment URL

### Deploy Frontend (Optional - Expo)

If you want to deploy the frontend as a web app:

1. Build for web:
```bash
cd frontend
npm run build:web
```

2. Deploy the `web-build` directory to Vercel:
```bash
vercel --prod
```

## Important Notes

### WebSocket Support
⚠️ **Vercel has limitations with WebSockets**:
- Vercel Serverless Functions have a 10-second timeout
- WebSocket connections may not work reliably on Vercel
- Consider using Vercel Edge Functions or a separate WebSocket service

**Alternative for WebSockets**:
1. Deploy WebSocket server separately (Railway, Render, or Fly.io)
2. Use Supabase Realtime for real-time features
3. Use polling as a fallback

### Database Migrations

Run migrations manually before deployment:
```bash
cd backend
make migrate-up
```

Or use the migrate script:
```bash
cd backend/scripts
./migrate.sh up
```

### Testing the Deployment

1. **Health Check**:
```bash
curl https://your-vercel-url.vercel.app/health/ping
```

2. **API Test**:
```bash
curl https://your-vercel-url.vercel.app/api/v1/health
```

## Continuous Deployment

### GitHub Integration

1. Go to Vercel Dashboard
2. Import your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: (leave empty)

4. Add all environment variables in Vercel Dashboard

5. Enable automatic deployments:
   - Production: `main` branch
   - Preview: All other branches

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Monitoring

### View Logs
```bash
vercel logs
```

### View Deployment Status
```bash
vercel ls
```

### View Project Info
```bash
vercel inspect
```

## Troubleshooting

### Issue: Build Fails
- Check Go version compatibility (Vercel supports Go 1.x)
- Verify all dependencies are in `go.mod`
- Check build logs: `vercel logs`

### Issue: Environment Variables Not Working
- Verify variables are set for "Production" environment
- Redeploy after adding variables: `vercel --prod`
- Check variable names match exactly (case-sensitive)

### Issue: Database Connection Fails
- Verify Supabase allows connections from Vercel IPs
- Check SSL mode is set to `require`
- Verify connection string format

### Issue: Redis Connection Fails
- Verify Upstash Redis URL format
- Check Redis allows connections from Vercel
- Verify TLS is enabled (rediss://)

## Cost Considerations

### Vercel Free Tier Limits:
- 100 GB bandwidth per month
- 100 hours serverless function execution
- 1000 serverless function invocations per day

### Recommended for Production:
- **Vercel Pro**: $20/month
  - Unlimited bandwidth
  - Unlimited serverless function execution
  - Custom domains
  - Team collaboration

## Alternative: Hybrid Deployment

If WebSockets are critical:

1. **Backend API**: Deploy to Vercel (REST endpoints)
2. **WebSocket Server**: Deploy to Railway/Render (WebSocket support)
3. **Frontend**: Use Expo for mobile, Vercel for web

Update frontend to use different URLs:
```typescript
const API_URL = 'https://your-vercel-url.vercel.app/api/v1';
const WS_URL = 'wss://your-railway-url.railway.app';
```

## Next Steps

1. ✅ Deploy backend to Vercel
2. ✅ Configure environment variables
3. ✅ Update frontend API URLs
4. ✅ Test all endpoints
5. ✅ Set up custom domain (optional)
6. ✅ Configure CI/CD with GitHub
7. ✅ Set up monitoring and alerts

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Community: https://github.com/vercel/vercel/discussions
