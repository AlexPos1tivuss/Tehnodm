#!/bin/bash
echo "=== Repair Story Pro Demo ==="
echo ""

echo "1. Running seed..."
pnpm --filter @workspace/scripts run seed
echo ""

echo "2. Login as client..."
TOKEN=$(curl -s -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client1@example.com","password":"Passw0rd!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token received: ${TOKEN:0:20}..."
echo ""

echo "3. Create booking..."
BOOKING=$(curl -s -X POST http://localhost:80/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"device":"iPhone 14","issue":"Screen replacement needed"}')
echo "Booking: $BOOKING"
CODE=$(echo $BOOKING | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
BID=$(echo $BOOKING | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "Code: $CODE, ID: $BID"
echo ""

echo "4. Track booking by code..."
curl -s http://localhost:80/api/bookings/track/$CODE
echo ""
echo ""

echo "5. Login as admin and change status..."
ADMIN_TOKEN=$(curl -s -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Passw0rd!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s -X PATCH http://localhost:80/api/bookings/$BID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"to":"accepted","note":"Accepted for repair"}'
echo ""
echo ""

echo "6. Check calendar slots..."
curl -s "http://localhost:80/api/calendar/slots?date=2026-03-18"
echo ""
echo ""

echo "=== Demo Complete ==="
