# Subscription System Documentation

## Overview

The Books App now has a complete subscription system that requires users to have an active subscription to read books. Users must:

1. **Sign up/Log in** to access the app
2. **Purchase a subscription** to read any books

## Features Implemented

### 1. **Subscription Plans**

Three subscription tiers are available:

- **Monthly**: $12.40/month
- **Quarterly** (Best Value): $25.00 every 3 months  
- **Yearly**: $45.00/year

### 2. **Access Control**

- **Guest users** cannot read books (must log in first)
- **Logged-in users without subscription** are prompted to subscribe when trying to read
- **Active subscribers** have unlimited access to all books

### 3. **Subscription Checking**

The system checks subscription status in two ways:

- **Local check**: Fast check using cached subscription data
- **Server check**: Validates against Firestore to ensure accuracy

### 4. **User Interface**

#### Subscription Modal

- Displays when a non-subscribed user tries to read a book
- Shows all three pricing plans with clear pricing
- Handles payment flow (currently mock payment)

#### Profile Page

- Shows subscription status for logged-in users:
  - **Active subscription**: Displays plan name and expiry date with premium badge
  - **No subscription**: Shows warning and "Subscribe Now" button
- Guest users see login button instead

### 5. **Data Storage**

#### Firestore Structure

```
users/{userId}/
  ├── (user data: email, displayName, etc.)
  └── subscription/
      └── current/
          ├── status: 'active' | 'expired' | null
          ├── plan: 'monthly' | 'quarterly' | 'yearly'
          ├── expiry: Timestamp
          └── purchasedAt: Timestamp
```

#### Local Storage

Subscription data is cached locally for faster access:

```javascript
userProfile: {
  subscriptionStatus: 'active',
  subscriptionExpiry: '2025-01-02T00:00:00.000Z',
  subscriptionPlan: 'monthly'
}
```

### 6. **Security**

#### Firestore Rules

The subscription subcollection is protected:

```javascript
match /users/{userId}/subscription/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

This ensures:

- Only authenticated users can access subscription data
- Users can only access their own subscription information

## User Flow

### New User Journey

1. User opens the app → sees books but cannot read them
2. User clicks on a book → "Read Now" button
3. System checks if user is logged in → Shows login modal
4. User signs up/logs in
5. User clicks "Read Now" again → System checks subscription
6. No subscription found → Shows subscription modal
7. User selects a plan and confirms purchase
8. Subscription activated → User can now read all books

### Returning User Journey

1. User opens the app (already logged in)
2. System loads subscription status from Firestore
3. If subscription is active → Full access to all books
4. If subscription expired → Prompted to renew when trying to read

## Implementation Details

### Key Functions

#### `checkSubscription()`

```javascript
async function checkSubscription() {
  // 1. Check local cache first (fast)
  // 2. Verify with Firestore (accurate)
  // 3. Update local cache if needed
  // Returns: true if active, false otherwise
}
```

#### `purchaseSubscription(plan, price)`

```javascript
async function purchaseSubscription(plan, price) {
  // 1. Verify user is logged in
  // 2. Confirm purchase with user
  // 3. Calculate expiry date based on plan
  // 4. Save to Firestore
  // 5. Update local cache
  // 6. Show success message
}
```

#### `openReader(book)`

```javascript
async function openReader(book) {
  // 1. Check if user is logged in
  // 2. Check if user has active subscription
  // 3. If both pass, open the book reader
  // 4. Otherwise, show appropriate modal
}
```

### Firebase Integration

The system uses Firebase helpers defined in `firebase-config.js`:

```javascript
// Get user's subscription
window.firebaseHelpers.getUserSubscription(userId)

// Update subscription
window.firebaseHelpers.updateUserSubscription(userId, {
  status: 'active',
  plan: 'monthly',
  expiry: expiryDate,
  purchasedAt: new Date()
})
```

## Testing the System

### Test Scenario 1: New User

1. Open the app in incognito mode
2. Try to read a book → Should show login modal
3. Sign up with a new account
4. Try to read again → Should show subscription modal
5. Select a plan and purchase
6. Try to read → Should open the book reader

### Test Scenario 2: Existing User Without Subscription

1. Log in with an existing account (no subscription)
2. Try to read a book → Should show subscription modal
3. Purchase a subscription
4. Try to read → Should work

### Test Scenario 3: Active Subscriber

1. Log in with an account that has an active subscription
2. Navigate to Profile → Should see subscription status
3. Try to read any book → Should work immediately

## Future Enhancements

### Payment Integration

Currently using mock payment. To integrate real payments:

1. Add Stripe/PayPal SDK
2. Replace `purchaseSubscription()` mock logic with actual payment processing
3. Add webhook handlers for payment confirmation
4. Implement subscription renewal reminders

### Additional Features

- **Free trial**: 7-day free trial for new users
- **Subscription management**: Allow users to cancel/upgrade plans
- **Payment history**: Show past transactions
- **Auto-renewal**: Automatic subscription renewal
- **Family plans**: Share subscription with family members
- **Promo codes**: Discount codes for special offers

## Troubleshooting

### Issue: Subscription not showing after purchase

**Solution**: Check browser console for errors. Verify Firestore rules allow write access.

### Issue: User can read books without subscription

**Solution**: Ensure `openReader()` function is being called (not the old duplicate). Check that subscription checking logic is not bypassed.

### Issue: Subscription status not updating

**Solution**: Clear localStorage and refresh. Check that `window.globalUserProfile` is being used consistently.

## Files Modified

1. **webapp/js/app.js**
   - Added subscription checking logic
   - Updated `openReader()` to require subscription
   - Added subscription display to profile page
   - Implemented `purchaseSubscription()` function

2. **webapp/js/firebase-config.js**
   - Already had subscription helper functions
   - `getUserSubscription()` and `updateUserSubscription()`

3. **webapp/index.html**
   - Already had subscription modal UI
   - Pricing cards with plan selection

4. **webapp/css/subscription.css**
   - Already had styling for subscription modal

5. **firestore.rules**
   - Already had security rules for subscription subcollection

## Summary

The subscription system is now fully functional and enforces that:

- ✅ Users must be logged in to read books
- ✅ Users must have an active subscription to access content
- ✅ Subscription status is displayed on the profile page
- ✅ Multiple subscription plans are available
- ✅ Data is securely stored in Firestore
- ✅ Subscription expiry is properly tracked

The system provides a complete paywall solution for the Books App, ensuring that all content is properly monetized through subscriptions.
