#!/bin/bash

# SafeAround - API Keys Verification Script
# Verifies that all API keys are properly configured

set -e

echo "🔑 SafeAround - API Keys Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_key() {
    local file=$1
    local key_name=$2
    local key_value=$3
    
    if [ -f "$file" ]; then
        if grep -q "^${key_name}=" "$file"; then
            current_value=$(grep "^${key_name}=" "$file" | cut -d'=' -f2-)
            if [ "$current_value" = "$key_value" ]; then
                echo -e "${GREEN}✓${NC} $file - $key_name is configured correctly"
                return 0
            elif [[ "$current_value" =~ ^your_ ]] || [ -z "$current_value" ]; then
                echo -e "${RED}✗${NC} $file - $key_name is NOT configured (placeholder value)"
                return 1
            else
                echo -e "${YELLOW}⚠${NC} $file - $key_name has a different value"
                return 2
            fi
        else
            echo -e "${RED}✗${NC} $file - $key_name is MISSING"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $file - File NOT FOUND"
        return 1
    fi
}

# Expected API key
EXPECTED_KEY="AIzaSyBfi1CO-cAF0aJBxktzJLQYwq2IuzqXVMY"

echo "Checking Google Maps API Key configuration..."
echo ""

# Check Frontend Development
check_key "frontend/.env.development" "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" "$EXPECTED_KEY"
frontend_dev=$?

# Check Frontend Production
check_key "frontend/.env.production" "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" "$EXPECTED_KEY"
frontend_prod=$?

# Check Backend
check_key "backend/.env" "GOOGLE_MAPS_API_KEY" "$EXPECTED_KEY"
backend=$?

echo ""
echo "======================================"

# Summary
if [ $frontend_dev -eq 0 ] && [ $frontend_prod -eq 0 ] && [ $backend -eq 0 ]; then
    echo -e "${GREEN}✅ All API keys are configured correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Restart frontend: cd frontend && npm start -- --clear"
    echo "2. Restart backend: cd backend && docker-compose restart backend"
    echo "3. Test location search in the app"
    exit 0
else
    echo -e "${RED}❌ Some API keys are not configured correctly${NC}"
    echo ""
    echo "To fix, run:"
    echo "./setup-google-maps.sh $EXPECTED_KEY"
    exit 1
fi
