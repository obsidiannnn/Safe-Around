#!/usr/bin/env python3
"""
SafeAround API Endpoint Testing Script
Tests all endpoints and reports bugs
"""

import requests
import json
from typing import Dict, Optional, Tuple
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

# Test credentials
TEST_PHONE = "+919997759064"
TEST_PASSWORD = "Anurag@123"

# Colors for terminal output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

# Test results
test_results = {
    'total': 0,
    'passed': 0,
    'failed': 0,
    'warnings': 0,
    'bugs_found': []
}

auth_token = None

def print_header(text: str):
    """Print section header"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.NC}")
    print(f"{Colors.BLUE}{text}{Colors.NC}")
    print(f"{Colors.BLUE}{'='*60}{Colors.NC}\n")

def print_result(test_name: str, status: str, message: str = ""):
    """Print test result"""
    test_results['total'] += 1
    
    if status == "PASS":
        print(f"{Colors.GREEN}✓ PASS{Colors.NC}: {test_name}")
        test_results['passed'] += 1
    elif status == "FAIL":
        print(f"{Colors.RED}✗ FAIL{Colors.NC}: {test_name}")
        if message:
            print(f"  {Colors.RED}└─ {message}{Colors.NC}")
        test_results['failed'] += 1
        test_results['bugs_found'].append({
            'test': test_name,
            'message': message
        })
    elif status == "WARN":
        print(f"{Colors.YELLOW}⚠ WARN{Colors.NC}: {test_name}")
        if message:
            print(f"  {Colors.YELLOW}└─ {message}{Colors.NC}")
        test_results['warnings'] += 1

def test_endpoint(
    method: str,
    endpoint: str,
    expected_status: int,
    test_name: str,
    data: Optional[Dict] = None,
    auth_required: bool = False,
    params: Optional[Dict] = None
) -> Tuple[bool, Optional[Dict]]:
    """Test an API endpoint"""
    
    headers = {"Content-Type": "application/json"}
    if auth_required and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method == "GET":
            response = requests.get(endpoint, headers=headers, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(endpoint, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(endpoint, headers=headers, json=data, timeout=10)
        elif method == "PATCH":
            response = requests.patch(endpoint, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(endpoint, headers=headers, timeout=10)
        else:
            print_result(test_name, "FAIL", f"Unsupported method: {method}")
            return False, None
        
        if response.status_code == expected_status:
            print_result(test_name, "PASS")
            try:
                return True, response.json()
            except:
                return True, None
        else:
            error_msg = f"Expected {expected_status}, got {response.status_code}"
            try:
                error_data = response.json()
                if 'error' in error_data:
                    error_msg += f" - {error_data['error']}"
            except:
                error_msg += f" - {response.text[:100]}"
            
            print_result(test_name, "FAIL", error_msg)
            return False, None
            
    except requests.exceptions.ConnectionError:
        print_result(test_name, "FAIL", "Connection refused - is the server running?")
        return False, None
    except requests.exceptions.Timeout:
        print_result(test_name, "FAIL", "Request timeout")
        return False, None
    except Exception as e:
        print_result(test_name, "FAIL", f"Exception: {str(e)}")
        return False, None

def main():
    global auth_token
    
    print_header("SafeAround API Endpoint Testing")
    print(f"Testing API at: {BASE_URL}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 1. Health Check Endpoints
    print_header("Health Check Endpoints")
    test_endpoint("GET", f"{BASE_URL}/health", 200, "Health Check")
    test_endpoint("GET", f"{BASE_URL}/health/ping", 200, "Health Ping")
    test_endpoint("GET", f"{BASE_URL}/health/readiness", 200, "Health Readiness")
    
    # 2. Authentication Endpoints
    print_header("Authentication Endpoints")
    
    # Login
    print("Attempting login to get auth token...")
    success, response = test_endpoint(
        "POST",
        f"{API_URL}/auth/login",
        200,
        "Login",
        data={"phone": TEST_PHONE, "password": TEST_PASSWORD}
    )
    
    if success and response:
        if 'data' in response and 'token' in response['data']:
            auth_token = response['data']['token']
            print(f"  {Colors.GREEN}└─ Auth token obtained: {auth_token[:30]}...{Colors.NC}")
        elif 'tokens' in response and 'access' in response['tokens']:
            auth_token = response['tokens']['access']
            print(f"  {Colors.GREEN}└─ Auth token obtained: {auth_token[:30]}...{Colors.NC}")
        elif 'token' in response:
            auth_token = response['token']
            print(f"  {Colors.GREEN}└─ Auth token obtained: {auth_token[:30]}...{Colors.NC}")
        else:
            print(f"  {Colors.RED}└─ Token not found in response{Colors.NC}")
            print(f"  Response: {json.dumps(response, indent=2)}")
    
    if not auth_token:
        print(f"\n{Colors.RED}Cannot continue with authenticated endpoint tests{Colors.NC}")
        print_summary()
        return
    
    # 3. Profile Endpoints
    print_header("Profile Endpoints")
    test_endpoint("GET", f"{API_URL}/users/profile", 200, "Get Profile", auth_required=True)
    test_endpoint("GET", f"{API_URL}/users/contacts", 200, "Get Emergency Contacts", auth_required=True)
    
    # Test adding a contact
    contact_data = {
        "name": "Test Contact",
        "phone": "+919999999999",
        "relationship": "friend"
    }
    success, response = test_endpoint(
        "POST",
        f"{API_URL}/users/contacts",
        201,
        "Add Emergency Contact",
        data=contact_data,
        auth_required=True
    )
    
    contact_id = None
    if success and response:
        if 'data' in response and 'id' in response['data']:
            contact_id = response['data']['id']
        elif 'id' in response:
            contact_id = response['id']
    
    # Test deleting contact if created
    if contact_id:
        test_endpoint(
            "DELETE",
            f"{API_URL}/users/contacts/{contact_id}",
            200,
            "Delete Emergency Contact",
            auth_required=True
        )
    
    # 4. Location Endpoints
    print_header("Location Endpoints")
    location_data = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "accuracy": 10.5
    }
    test_endpoint("POST", f"{API_URL}/location", 200, "Update Location", 
                 data=location_data, auth_required=True)
    test_endpoint("GET", f"{API_URL}/location/me", 200, "Get Current Location", 
                 auth_required=True)
    test_endpoint("GET", f"{API_URL}/location/nearby", 200, "Get Nearby Users",
                 params={"lat": 28.6139, "lng": 77.2090, "radius": 5000}, auth_required=True)
    
    # 5. Heatmap Endpoints
    print_header("Heatmap Endpoints")
    heatmap_params = {"lat": 28.6139, "lng": 77.2090, "radius": 5000}
    test_endpoint("GET", f"{API_URL}/heatmap/data", 200, "Get Heatmap Data", 
                 params=heatmap_params)
    test_endpoint("GET", f"{API_URL}/heatmap/grid", 200, "Get Grid Data", 
                 params=heatmap_params)
    test_endpoint("GET", f"{API_URL}/heatmap/zone", 200, "Get Zone Info",
                 params={"lat": 28.6139, "lng": 77.2090})
    test_endpoint("GET", f"{API_URL}/heatmap/crimes", 200, "Get Recent Crimes",
                 params=heatmap_params)
    test_endpoint("GET", f"{API_URL}/heatmap/statistics", 200, "Get Statistics",
                 params=heatmap_params)
    
    # 6. Alert Endpoints
    print_header("Alert Endpoints")
    alert_data = {
        "type": "emergency",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "message": "Test emergency alert"
    }
    success, response = test_endpoint(
        "POST",
        f"{API_URL}/alerts",
        201,
        "Create Alert",
        data=alert_data,
        auth_required=True
    )
    
    alert_id = None
    if success and response:
        if 'data' in response and 'id' in response['data']:
            alert_id = response['data']['id']
        elif 'id' in response:
            alert_id = response['id']
        
        if alert_id:
            print(f"  {Colors.GREEN}└─ Alert created with ID: {alert_id}{Colors.NC}")
    
    if alert_id:
        test_endpoint("GET", f"{API_URL}/alerts/{alert_id}", 200, "Get Alert Details",
                     auth_required=True)
    
    test_endpoint("GET", f"{API_URL}/alerts/active", 200, "Get Active Alerts",
                 auth_required=True)
    test_endpoint("GET", f"{API_URL}/alerts/history", 200, "Get Alert History",
                 auth_required=True)
    
    # 7. Geofencing Endpoints
    print_header("Geofencing Endpoints")
    test_endpoint("GET", f"{API_URL}/geofencing/check", 200, "Check Danger Zone",
                 params={"lat": 28.6139, "lng": 77.2090}, auth_required=True)
    test_endpoint("GET", f"{API_URL}/geofencing/zones", 200, "Get Danger Zones",
                 params={"lat": 28.6139, "lng": 77.2090, "radius": 5000}, auth_required=True)
    test_endpoint("GET", f"{API_URL}/geofencing/nearby-users", 200, "Get Nearby Users (Geofencing)",
                 params={"lat": 28.6139, "lng": 77.2090, "radius": 5000}, auth_required=True)
    
    # 8. Route Planning Endpoints
    print_header("Route Planning Endpoints")
    route_data = {
        "origin": {"lat": 28.6139, "lng": 77.2090},
        "destination": {"lat": 28.7041, "lng": 77.1025},
        "mode": "driving"
    }
    test_endpoint("POST", f"{API_URL}/routes/safe", 200, "Get Safe Routes",
                 data=route_data, auth_required=True)
    
    # 9. Notification Endpoints
    print_header("Notification Endpoints")
    test_endpoint("GET", f"{API_URL}/notifications/history", 200, "Get Notification History",
                 auth_required=True)
    
    # 10. Error Handling Tests
    print_header("Error Handling Tests")
    test_endpoint("GET", f"{API_URL}/invalid/endpoint", 404, "Invalid Endpoint (404)")
    test_endpoint("GET", f"{API_URL}/users/profile", 401, "Unauthorized Access (401)")
    
    # Print summary
    print_summary()

def print_summary():
    """Print test summary"""
    print_header("Test Summary")
    print(f"Total Tests: {test_results['total']}")
    print(f"{Colors.GREEN}Passed: {test_results['passed']}{Colors.NC}")
    print(f"{Colors.RED}Failed: {test_results['failed']}{Colors.NC}")
    print(f"{Colors.YELLOW}Warnings: {test_results['warnings']}{Colors.NC}")
    
    if test_results['bugs_found']:
        print(f"\n{Colors.RED}Bugs Found:{Colors.NC}")
        for i, bug in enumerate(test_results['bugs_found'], 1):
            print(f"{i}. {bug['test']}")
            print(f"   └─ {bug['message']}")
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.NC}")
    if test_results['failed'] == 0:
        print(f"{Colors.GREEN}All tests passed!{Colors.NC}")
    else:
        print(f"{Colors.RED}Some tests failed. Please review the output above.{Colors.NC}")
    print(f"{Colors.BLUE}{'='*60}{Colors.NC}\n")

if __name__ == "__main__":
    main()
