# Apple Pay Quick Start Guide

## ✅ Setup Complete!

The Apple Pay domain association file has been configured for your storefront.

## What Was Done

1. ✅ **Domain Association File Installed**
   - File location: `public/.well-known/apple-developer-merchantid-domain-association`
   - Accessible at: `https://your-domain.com/.well-known/apple-developer-merchantid-domain-association`

2. ✅ **Next.js Configured**
   - Added proper headers for the domain association file
   - Content-Type: `application/octet-stream`
   - Cache-Control configured

## Next Steps

### 1. Test File Accessibility

```bash
# Start development server
npm run dev

# In another terminal, test file access
curl http://localhost:3000/.well-known/apple-developer-merchantid-domain-association

# Should return the certificate content (not 404)
```

### 2. Register Domain with PayPal

**Option A: Via PayPal App UI (Recommended)**

1. Open Saleor Admin Dashboard
2. Navigate to Apps → PayPal
3. Find "Merchant Connection" section
4. Scroll to "Apple Pay Domain Management"
5. Enter your domain (e.g., `your-storefront.wsm-dev.com`)
6. Click "Register Domain"
7. Wait for status to show "VERIFIED" (usually takes a few minutes)

**Option B: Via API (Advanced)**

See `APPLE_PAY_SETUP.md` for API registration instructions.

### 3. Verify Apple Pay is Working

1. **Check merchant capabilities:**
   - In PayPal app logs, look for: `✓ Apple Pay is ENABLED for merchant`
   - Or look for warning: `✗ Apple Pay is DISABLED`

2. **Open storefront in Safari:**
   - Add items to cart
   - Go to checkout
   - Look for Apple Pay button (black button with Apple logo)

3. **Test payment:**
   - Click Apple Pay button
   - Authenticate with Face ID/Touch ID
   - Complete test payment

## Troubleshooting

### Apple Pay Button Not Showing

**Run Diagnostic:**

1. Check browser console for errors
2. Check PayPal app logs for:
   ```
   Google Pay readiness check
   Apple Pay readiness check
   ```

3. Look for capability status:
   ```
   apple_pay_capability_status: "ACTIVE" (good)
   apple_pay_capability_status: "NOT_FOUND" (needs enablement)
   ```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Domain not accessible | Verify file at `/.well-known/apple-developer-merchantid-domain-association` returns 200 |
| Domain not registered | Register domain via PayPal app UI |
| Apple Pay capability not enabled | Contact PayPal support to enable APPLE_PAY capability |
| PAYMENT_METHODS not subscribed | Contact PayPal support to enable PAYMENT_METHODS product |
| Not using Safari | Apple Pay only works in Safari on Mac/iOS |

### Check Logs

**In PayPal App:**

Look for these log messages:

```
✓ Apple Pay is ENABLED for merchant
  - Shows Apple Pay is working

✗ Apple Pay is DISABLED - capability not active
  - Check merchant capabilities

✗ Apple Pay is DISABLED - product requirements not met
  - Contact PayPal support
```

**In Storefront Console:**

```javascript
// Check Apple Pay support
console.log(window.ApplePaySession ? 'Supported' : 'Not supported');
console.log(ApplePaySession.canMakePayments());
```

## Current Status

### What's Working ✅

- Domain association file hosted
- Next.js configured to serve the file
- File accessible at correct path
- Proper headers configured

### What You Need To Do 📋

1. **Register your domain** with PayPal (via app UI or API)
2. **Verify domain status** is "VERIFIED"
3. **Enable Apple Pay capability** for merchant (if not already enabled)
4. **Test payment flow** in Safari

## Quick Reference

### File Locations

```
public/.well-known/apple-developer-merchantid-domain-association  (✅ Installed)
```

### URLs

```
Development: http://localhost:3000/.well-known/apple-developer-merchantid-domain-association
Production: https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
```

### Documentation

- Full setup guide: `APPLE_PAY_SETUP.md`
- PayPal app docs: `apps/paypal/APPLE_PAY_IMPLEMENTATION_GUIDE.md`

## Need Help?

1. Check `APPLE_PAY_SETUP.md` for detailed instructions
2. Check PayPal app logs for diagnostic information
3. Contact PayPal Partner Support for capability enablement
4. Check Apple Developer documentation for Apple Pay issues

---

**Ready to test!** 🎉

Start your dev server and navigate to checkout to see if the Apple Pay button appears.
