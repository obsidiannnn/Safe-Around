#!/bin/bash

# SafeAround - Google Maps API Setup Script
# This script helps you configure Google Maps API key

set -e

echo "🗺️  SafeAround - Google Maps API Setup"
echo "======================================"
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Google Maps API key not provided"
    echo ""
    echo "Usage: ./setup-google-maps.sh YOUR_API_KEY"
    echo ""
    echo "To get an API key:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a project"
    echo "3. Enable Maps SDK, Places API, Geocoding API, Directions API"
    echo "4. Create credentials → API Key"
    echo "5. Copy the API key and run this script"
    echo ""
    exit 1
fi

API_KEY="$1"

echo "📝 Configuring Google Maps API Key..."
echo ""

# Configure Frontend Development
if [ -f "frontend/.env.development" ]; then
    echo "✓ Updating frontend/.env.development..."
    sed -i.bak "s/EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=.*/EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$API_KEY/" frontend/.env.development
    rm -f frontend/.env.development.bak
else
    echo "⚠️  frontend/.env.development not found, creating..."
    cat > frontend/.env.development << EOF
API_URL=http://localhost:8000/api/v1
WS_URL=ws://localhost:8000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$API_KEY
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
EOF
fi

# Configure Frontend Production
if [ -f "frontend/.env.production" ]; then
    echo "✓ Updating frontend/.env.production..."
    sed -i.bak "s/EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=.*/EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$API_KEY/" frontend/.env.production
    rm -f frontend/.env.production.bak
else
    echo "⚠️  frontend/.env.production not found, creating..."
    cat > frontend/.env.production << EOF
API_URL=https://api.safearound.app/api/v1
WS_URL=wss://ws.safearound.app
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$API_KEY
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
EOF
fi

# Configure Backend
if [ -f "backend/.env" ]; then
    echo "✓ Updating backend/.env..."
    if grep -q "GOOGLE_MAPS_API_KEY=" backend/.env; then
        sed -i.bak "s/GOOGLE_MAPS_API_KEY=.*/GOOGLE_MAPS_API_KEY=$API_KEY/" backend/.env
        rm -f backend/.env.bak
    else
        echo "GOOGLE_MAPS_API_KEY=$API_KEY" >> backend/.env
    fi
else
    echo "⚠️  backend/.env not found, please create it from backend/.env.example"
fi

echo ""
echo "======================================"
echo "✅ Google Maps API Key configured!"
echo ""
echo "Next steps:"
echo "1. Frontend: cd frontend && npm start -- --clear"
echo "2. Backend: cd backend && docker-compose restart backend"
echo "3. Test location search in the app"
echo ""
echo "📚 For more details, see: GOOGLE_MAPS_API_SETUP.md"
echo ""
