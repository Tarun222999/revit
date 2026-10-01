# Version 1 Features

## Product Direction

This app is a `journal-first personal entertainment journal` where users can track, rate, review, and organize:

- Movies
- Series
- Anime
- Games

Version 1 should be:

- Personal and self-centric
- Production-ready
- Simple to use
- Extensible later for social and discovery features

## Final V1 Feature Set

1. `Authentication`
   - Continue with Google
   - Continue with Apple on iOS
   - Continue with Email via OTP / magic link

2. `Basic onboarding`
   - Display name
   - Username
   - Optional avatar

3. `Universal search`
   - Search across movies, series, anime, and games

4. `Title details`
   - Artwork
   - Summary
   - Genre/category info
   - Release/platform/network details where available

5. `Add to journal`
   - Add any title to the personal journal

6. `Status tracking`
   - Planned
   - In progress
   - Completed
   - Dropped

7. `Universal rating`
   - One shared `0.5 to 5.0` rating system across all media
   - Slider-based input for v1

8. `Short-form review`
   - Optional headline up to `80` characters
   - Review body with short-form limits
   - Spoiler toggle

9. `Edit and delete entry`
   - Update status, rating, and review later
   - Remove entry if needed

10. `Journal views`
    - Timeline view
    - Calendar view
    - Filter by media type, status, and rating
    - Sort by recent, rating, and title

11. `Custom lists`
    - Mixed-media lists by default
    - Examples: Favorites, Watch Next, Best Endings

12. `Discover`
    - Trending and category browsing
    - No separate personal dashboard in v1

13. `Profile / Account`
    - Personal identity
    - Edit profile details
    - Avatar update
    - Connected accounts where available
    - Privacy Policy, Terms of Use, Credits / Attributions, and Support
    - Sign out
    - Delete account

14. `Usability essentials`
    - Loading states
    - Empty states
    - Validation
    - Error handling
    - Smooth create/edit flow

## Auth Decisions

The app should not use separate `Sign In`, `Sign Up`, and `Forgot Password` screens in v1.

Use this production-ready auth flow instead:

1. `Welcome / Auth`
   - Continue with Google
   - Continue with Apple on iOS
   - Continue with Email

2. `Email Code`
   - Email input
   - OTP or magic link verification

3. `Onboarding / Create Profile`
   - Display name
   - Username
   - Optional avatar

Notes:

- If Google login is available on iOS, Sign in with Apple should also be supported.
- Email/password is not the preferred auth flow for this app.
- Account deletion should be supported inside the app for production readiness.

## Screen Count

The final v1 structure is:

- `10 core screens`
- `1 core modal`

### Screens

1. Welcome / Auth
2. Email Code
3. Onboarding / Create Profile
4. Discover
5. Search
6. Journal
7. Lists
8. Profile / Account
9. Title Details
10. Single List Details

### Modal

11. Add / Edit Journal Entry

## Navigation Structure

### Bottom Tabs

- Discover
- Search
- Journal
- Lists

### Top-Right Avatar Entry

- Profile / Account

### Shared Push Screens

- Title Details
- Single List Details
- Profile / Account

### Modal

- Add / Edit Journal Entry

## Screen-by-Screen Wireframe Outline

### 1. Welcome / Auth

- App logo
- App name
- Tagline: `Your personal entertainment journal`
- Continue with Google
- Continue with Apple on iOS
- Continue with Email
- Footer links for Privacy Policy and Terms

### 2. Email Code

- Back button
- Title: `Continue with Email`
- Helper text
- Email input
- Send Code button
- OTP/code input after send
- Verify button
- Resend Code action

### 3. Onboarding / Create Profile

- Title: `Set up your profile`
- Avatar picker
- Display name input
- Username input
- Optional media-interest chips
- Continue button

### 4. Discover

- Header with avatar/profile action
- Featured banner or hero section
- Trending Now row
- Movies row
- Series row
- Anime row
- Games row
- Optional recently released row

There is no separate dashboard or Home tab in v1. Discover is the browsing-focused home surface, while entry management belongs in Journal and account actions belong in Profile / Account.

### 5. Search

- Large search bar
- Filter chips:
  - All
  - Movies
  - Series
  - Anime
  - Games
- Search results list with:
  - Poster/cover
  - Title
  - Year
  - Media type badge
  - Short metadata line

### 6. Journal

- Header: `My Journal`
- Segmented switch:
  - Timeline
  - Calendar
- Filter controls
- Sort controls

#### Timeline

- Date-grouped or month-grouped entries
- Each entry card contains:
  - Poster/cover
  - Title
  - Media type badge
  - Status
  - Rating
  - Review preview
  - Activity date

#### Calendar

- Month calendar grid
- Dots or counts on active days based on `entry created`
- Tap a date to reveal entries for that day

### 7. Lists

- Header: `Lists`
- Create List action
- List cards with:
  - List name
  - Optional description
  - Item count
  - Mixed-media cover collage

Lists should support mixed media by default.

### 8. Profile / Account

- Accessed from the top-right avatar/profile action, not the bottom tab bar
- Avatar
- Display name
- Username
- Edit profile details
- Update avatar
- Connected accounts where available
- Privacy Policy
- Terms of Use
- Credits / Attributions
- Support
- Sign Out
- Delete Account

The Profile / Account screen is account-focused. It should not become a taste dashboard in v1.

### 9. Title Details

- Large artwork/poster
- Title, year, media type
- Metadata row
- Summary
- Optional studio/network/developer/publisher info
- Your Entry section showing:
  - Current status
  - Rating
  - Review preview
  - Date logged
- Primary action:
  - Add to Journal
  - Edit Entry
- Secondary action:
  - Add to List

### 10. Single List Details

- Back button
- List name
- Optional description
- Item count
- Edit List action
- Add Items action
- Vertical item list with:
  - Poster/cover
  - Title
  - Media type badge
  - Optional user rating

### 11. Add / Edit Journal Entry Modal

- Close button
- Title and thumbnail
- Status selector
- Rating control
- Optional headline input
- Review text area
- Contains Spoilers toggle
- Optional Add to Lists multi-select
- Sticky Save button
- Delete Entry button when editing

This should be a modal, not a normal pushed screen.

## Key Product Rules

- `Discover` should be the single browsing-focused home surface, without a separate dashboard segment in v1.
- `Journal` should support both Timeline and Calendar views.
- `Lists` should be mixed-media by default.
- `Profile / Account` should own identity, avatar, legal/support, sign out, and account deletion.
- `Journal` should focus on managing and browsing entries.
- `Add / Edit Journal Entry` should stay fast and frictionless.

## Final Tech Decisions

- `React Native with Expo`
- `Supabase` for auth, database, storage, and Edge Functions
- `TMDB` for movies, series, and anime
- `IGDB` for games
- No ORM required for v1

## Not In V1

- Social feed
- Comments and likes
- Direct messaging
- Recommendation engine
- Gamification
- Standalone profile summary dashboard
- Long-form blog-style reviews
- Deep progress tracking like episode counts or game hours
