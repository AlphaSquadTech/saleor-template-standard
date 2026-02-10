# Apple Pay Setup Guide for Storefront

## Overview

This guide explains how to set up Apple Pay on your storefront to work with PayPal's Apple Pay integration.

## Prerequisites

- Storefront running on HTTPS (required for Apple Pay)
- PayPal app configured with Apple Pay capability
- Domain accessible publicly

---

## Step 1: Host Apple Domain Association File

### What is the Domain Association File?

The domain association file is a security file from Apple that proves your domain is authorized to process Apple Pay payments. PayPal provides this file for sandbox and production environments.

### Sandbox Environment

The file is already placed in your storefront:

```
public/.well-known/apple-developer-merchantid-domain-association
```

This file is served at:
```
https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
```

### Verify File is Accessible

1. **Start your development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Test the file is accessible:**
   ```bash
   curl https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
   ```

   You should see the file contents (a certificate).

3. **Verify in browser:**
   Navigate to: `https://your-domain.com/.well-known/apple-developer-merchantid-domain-association`

### Important Notes

- ✅ The file must be served with `Content-Type: application/octet-stream` or `text/plain`
- ✅ No redirects - Apple rejects 3XX responses
- ✅ Must be accessible via HTTPS only
- ✅ Must be at the exact path `/.well-known/apple-developer-merchantid-domain-association`

---

## Step 2: Configure Next.js to Serve the File

Next.js automatically serves files from the `public` directory. The file will be available at:

```
https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
```

### Verify Next.js Configuration

Make sure your `next.config.js` doesn't block the `.well-known` directory:

```javascript
// next.config.js
module.exports = {
  // ... other config

  // Ensure .well-known is not blocked
  async headers() {
    return [
      {
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/octet-stream',
          },
        ],
      },
    ];
  },
};
```

---

## Step 3: Register Domain with PayPal

After the file is hosted and accessible, register your domain with PayPal:

### Option 1: Via PayPal App UI

1. Navigate to the PayPal app in Saleor dashboard
2. Go to Merchant Connection section
3. Find "Apple Pay Domain Management"
4. Enter your domain (e.g., `store.example.com`)
5. Click "Register Domain"

### Option 2: Via API (for testing)

```bash
# Get access token
ACCESS_TOKEN=$(curl -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  | jq -r '.access_token')

# Generate PayPal-Auth-Assertion header
# Format: base64({"alg":"none"}).base64({"iss":"YOUR_CLIENT_ID","payer_id":"MERCHANT_ID"}).
HEADER=$(echo -n '{"alg":"none"}' | base64)
PAYLOAD=$(echo -n '{"iss":"YOUR_CLIENT_ID","payer_id":"MERCHANT_ID"}' | base64)
AUTH_ASSERTION="${HEADER}.${PAYLOAD}."

# Register domain
curl -X POST https://api-m.sandbox.paypal.com/v1/customer/wallet-domains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "PayPal-Auth-Assertion: $AUTH_ASSERTION" \
  -d '{
    "provider_type": "APPLE_PAY",
    "domain": {
      "name": "your-domain.com"
    }
  }'
```

---

## Step 4: Verify Domain Registration

### Check Registration Status

```bash
# Get registered domains
curl -X GET https://api-m.sandbox.paypal.com/v1/customer/wallet-domains \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "PayPal-Auth-Assertion: $AUTH_ASSERTION"
```

### Expected Response

```json
{
  "domains": [
    {
      "provider_type": "APPLE_PAY",
      "domain": {
        "name": "your-domain.com"
      },
      "status": "VERIFIED",
      "created_at": "2024-11-10T10:00:00Z",
      "updated_at": "2024-11-10T10:05:00Z"
    }
  ]
}
```

### Domain Status Values

- `VERIFIED` ✅ - Domain verified by Apple, ready to use
- `PENDING` ⏳ - Verification in progress (usually completes in minutes)
- `DENIED` ❌ - Verification failed (check domain accessibility)

---

## Step 5: Test Apple Pay Button

1. **Use Safari browser** (Apple Pay only works in Safari on Mac, or Safari/Chrome on iOS)

2. **Navigate to checkout page** with items in cart

3. **Look for Apple Pay button** - Should appear if:
   - ✅ Device supports Apple Pay
   - ✅ Domain is verified
   - ✅ Merchant has Apple Pay capability enabled
   - ✅ User has payment methods in Apple Wallet

4. **Complete test transaction:**
   - Click Apple Pay button
   - Authenticate with Face ID/Touch ID
   - Complete payment
   - Verify order is created

---

## Troubleshooting

### Apple Pay Button Not Showing

**Check 1: Browser Compatibility**
```javascript
// In browser console
console.log(window.ApplePaySession ? 'Supported' : 'Not supported');
console.log(ApplePaySession.canMakePayments());
```

**Check 2: Domain Association File**
```bash
curl -I https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
# Should return 200 OK
```

**Check 3: Domain Registration Status**
- Log into PayPal app
- Check Apple Pay Domain Management section
- Verify domain shows "VERIFIED" status

**Check 4: Merchant Capability**
- Verify merchant has `APPLE_PAY` capability active
- Check PayPal app logs for capability status

### Domain Verification Failed

**Common Causes:**

1. **File not accessible:**
   ```bash
   # Test accessibility
   curl https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
   ```

2. **Wrong content type:**
   - Should be `application/octet-stream` or `text/plain`
   - Check your Next.js headers configuration

3. **Redirect issues:**
   - Apple rejects 3XX redirects
   - Ensure direct access to the file

4. **HTTPS not working:**
   - Apple Pay requires valid HTTPS
   - Check SSL certificate is valid

### Payment Authorization Failed

1. **Check merchant configuration:**
   - Verify merchant ID in PayPal app
   - Ensure Apple Pay capability is active

2. **Check logs:**
   ```bash
   # In storefront
   # Check browser console for errors

   # In PayPal app
   # Check logs for Apple Pay session errors
   ```

3. **Verify token format:**
   - Ensure Apple Pay token is correctly passed to PayPal
   - Check token structure matches PayPal requirements

---

## Production Deployment

### Production Domain Association File

For production:

1. **Download production file** from PayPal:
   - URL: https://www.paypal.com/bizsignup/assets/ppcp/apple-developer-merchantid-domain-association

2. **Replace sandbox file:**
   ```bash
   # Download production file
   curl https://www.paypal.com/bizsignup/assets/ppcp/apple-developer-merchantid-domain-association \
     -o public/.well-known/apple-developer-merchantid-domain-association
   ```

3. **Register production domain:**
   - Use production PayPal API: `https://api-m.paypal.com`
   - Use production credentials
   - Register your production domain

### Production Checklist

- [ ] Production domain association file hosted
- [ ] File accessible via HTTPS (no redirects)
- [ ] Domain registered with PayPal production API
- [ ] Domain status is "VERIFIED"
- [ ] Merchant has Apple Pay capability in production
- [ ] SSL certificate valid and not expiring soon
- [ ] Tested Apple Pay payment flow end-to-end
- [ ] Verified refund flow works
- [ ] Customer support trained on Apple Pay

---

## Additional Resources

### PayPal Documentation

- [Apple Pay Integration Guide](https://developer.paypal.com/docs/multiparty/checkout/apm/apple-pay/)
- [Wallet Domains API Reference](https://developer.paypal.com/api/rest/reference/wallet/v1/wallet-domains/)

### Apple Documentation

- [Apple Pay on the Web](https://developer.apple.com/documentation/apple_pay_on_the_web)
- [Apple Pay JS API](https://developer.apple.com/documentation/apple_pay_on_the_web/apple_pay_js_api)

### Support

- **PayPal Partner Support**: Contact for capability enablement
- **Apple Developer Support**: For Apple Pay specific issues
- **PayPal App Logs**: Check for detailed error messages and debug IDs

---

## Summary

✅ **Setup Complete When:**
1. Domain association file is hosted and accessible
2. Domain registered with PayPal wallet-domains API
3. Domain status shows "VERIFIED"
4. Apple Pay button appears on checkout
5. Test payment completes successfully

🎉 **Your storefront is now ready to accept Apple Pay payments!**
