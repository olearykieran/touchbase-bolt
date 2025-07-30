# Real Estate Version - KeepTouch RE

## Overview
A professional relationship management app specifically designed for real estate agents to maintain connections with clients, prospects, and referral partners.

## Why a Separate App?
- **Clear branding** for real estate professionals
- **Targeted marketing** in App Store
- **Professional pricing** ($9.99/month or $99/year)
- **Industry-specific features** without cluttering personal app
- **No user confusion** between personal and professional use

## Core Differences from Personal Version

### 1. Message Types
Replace current message types with real estate-focused options:

| Personal Version | Real Estate Version |
|-----------------|-------------------|
| Default Catch-up | Client Check-in |
| Love Message | Market Update |
| Gratitude List | Home Anniversary |
| Birthday Message | Birthday Message (keep) |
| Random Joke | Home Maintenance Tip |
| Random Fact | Neighborhood News |
| Custom Message | Custom Message (keep) |

### 2. Additional Message Types
- **Just Closed** - Congratulations on closing
- **Referral Touch** - Soft ask for referrals
- **Holiday Greeting** - Real estate themed
- **Open House Invite** - Personalized invitations
- **Listing Alert** - New listings in their area

### 3. Contact Fields Enhancement
```typescript
interface RealEstateContact {
  // Existing fields
  name: string;
  email: string;
  phone: string;
  frequency: string;
  
  // New RE-specific fields
  clientType: 'buyer' | 'seller' | 'prospect' | 'referral_partner' | 'past_client';
  propertyAddress?: string;
  transactionDate?: Date;
  transactionType?: 'purchase' | 'sale' | 'both';
  propertyType?: 'single_family' | 'condo' | 'townhouse' | 'land' | 'commercial';
  priceRange?: string;
  notes?: string;
  source?: 'referral' | 'open_house' | 'online' | 'sign_call' | 'other';
  neighborhood?: string;
  homeAnniversary?: Date;
}
```

### 4. AI Prompt Examples

#### Market Update
```
Write a brief, professional market update message to {firstName} who bought a {propertyType} in {neighborhood} {timeAgo}.
Include:
- Friendly greeting
- One relevant market stat
- Personal touch about their home
- Soft offer to help
Keep it under 3 sentences.
```

#### Home Anniversary
```
Write a warm home anniversary message to {firstName} celebrating {years} years in their home at {neighborhood}.
Include:
- Congratulations on the anniversary
- Hope they're enjoying their home
- Offer to help with any real estate needs
Keep it personal but professional.
```

#### Maintenance Reminder
```
Write a helpful seasonal home maintenance reminder to {firstName} for {season}.
Include:
- Friendly greeting
- 1-2 specific maintenance tips
- Offer to recommend contractors if needed
Keep it helpful, not salesy.
```

## Implementation Plan

### Phase 1: Fork & Setup (Week 1)
1. Fork current repository as `keeptouch-re`
2. Create new Supabase project
3. Set up new RevenueCat app
4. Update bundle ID: `com.holygrailstudio.keeptouchre`
5. Design new icon with real estate theme

### Phase 2: Core Modifications (Week 2)
1. Update message types and prompts
2. Modify contact schema for RE fields
3. Update UI with professional theme
4. Remove personal-focused features

### Phase 3: RE-Specific Features (Week 3)
1. Add transaction tracking
2. Implement home anniversary reminders
3. Create market update templates
4. Add bulk messaging for market updates

### Phase 4: Professional Features (Week 4)
1. Contact categorization and filtering
2. Basic analytics (response rates, etc.)
3. Export functionality
4. Professional onboarding

## Monetization Strategy
- **Pricing**: $9.99/month or $99/year (save $20)
- **Free tier**: 3 contacts (same as personal)
- **Position**: Professional CRM-lite tool
- **Target**: Individual agents, not brokerages

## Marketing Angles
1. "Never forget a client again"
2. "Turn past clients into referral engines"
3. "The personal touch that wins listings"
4. "Your pocket real estate relationship manager"

## Future Features (Post-Launch)
- Team accounts for brokerages
- CRM integrations (Follow Up Boss, etc.)
- Automated drip campaigns
- Email/SMS integration
- Property photo storage
- Commission tracking
- Open house sign-in integration

## Technical Considerations
- Share 80% of codebase with personal version
- Maintain separate:
  - Bundle IDs
  - Supabase projects
  - RevenueCat projects
  - App Store listings
- Use git submodules or monorepo for shared code

## Success Metrics
- Target: 1,000 paying subscribers in first year
- $10K MRR within 12 months
- 4.5+ star rating
- 70% annual retention rate

## Next Steps
1. Finish polishing current personal app
2. Create detailed technical specification
3. Design RE-specific UI mockups
4. Fork and begin implementation
5. Beta test with 10-20 real estate agents
6. Launch on App Store

## Competitive Advantage
- **Simplicity**: Not trying to be full CRM
- **Personal touch**: Focuses on relationship, not transactions
- **Mobile-first**: Built for on-the-go agents
- **AI-powered**: Saves time with intelligent messages
- **Affordable**: Fraction of CRM cost