# Backend Deployment to Google Cloud Run

## Prerequisites
1. Google Cloud CLI installed and authenticated
2. Google Cloud project created with billing enabled
3. APIs enabled: Cloud Run, Container Registry, Cloud Build
4. Gemini API key from Google AI Studio

## Security Setup

### 1. Environment Variables
**NEVER commit sensitive keys to version control!**

Create a `.env` file locally (already in .gitignore):
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 2. Set Your API Keys
- Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Update your `.env` file with the actual key

## Deployment Steps

### 1. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Set Environment Variables for Cloud Run
Create a `.env.yaml` file with your environment variables:
```yaml
GEMINI_API_KEY: "YOUR_ACTUAL_GEMINI_API_KEY"
FRONTEND_URL: "https://your-frontend-domain.com"
```

### 4. Deploy to Cloud Run
```bash
gcloud run deploy hashtag-generator-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --port 8080
```

### 5. Get Your Backend URL
After deployment, Cloud Run will provide a URL like:
`https://hashtag-generator-backend-xxxxx-uc.a.run.app`

### 6. Update Frontend Configuration
Update your frontend's `API_BASE_URL` to point to the Cloud Run URL.

## Important Security Notes
- **NEVER** commit API keys or service account keys to version control
- Use Google Cloud's Secret Manager for production secrets
- The Firebase service account key should be managed via environment variables in production
- Set up proper CORS headers for your frontend domain only
- Consider using Cloud Run's traffic allocation for blue-green deployments

## Local Development
1. Copy `.env.example` to `.env`
2. Add your actual API keys to `.env`
3. Run `npm start` to start the server on port 8080
4. Frontend should connect to `http://localhost:8080` 