# ReUseHub — Student Marketplace

A student-focused marketplace for buying, selling, exchanging and discovering pre-owned campus essentials.

## Hosted implementation
This Hatchable build uses hosted passwordless email authentication, PostgreSQL, platform file storage and server-side API handlers. It does not currently use Firebase Authentication, Firestore, Firebase Storage, React/Vite or Express. Hatchable deploys static browser assets and isolated JavaScript API handlers without an npm build or conventional Express server, so this is an implementation adaptation.

## Features implemented
- Responsive landing page, categories, browse/search/filter/sort and product details
- Passwordless email sign-in via /login
- Persistent categories, listings, profiles, favourites, enquiries, conversations, messages, notifications and reports
- Listing ownership checks, input validation, non-negative pricing and free/exchange pricing rules
- Student dashboard and admin report moderation protected by server-side admin checks
- Open Library book search endpoint
- SQL schema, indexes and seeded marketplace categories

## Project structure
- public/: browser pages, styles and scripts
- api/: backend REST handlers
- migrations/0001_reusehub_schema.sql: database schema
- seed.sql: initial categories
- hatchable.toml: auth configuration

## Main API endpoints
- GET /api/categories
- GET, POST /api/listings
- GET, PATCH, DELETE /api/listings/:id
- GET, POST, DELETE /api/favourites
- GET, POST, PATCH /api/enquiries
- GET, POST /api/conversations
- GET, POST /api/conversations/:id/messages
- GET, PATCH /api/account/me
- GET /api/dashboard
- GET, PATCH /api/notifications
- POST /api/reports
- GET, PATCH /api/admin/reports (administrator only)
- GET /api/books/search?q=... (Open Library)

## Deployment
Deploy this project through Hatchable. Authentication is declared in hatchable.toml. Never put secrets in source files. Before making the app public, set project visibility in Hatchable Settings and verify anonymous and signed-in access.

## Important limitations before production
- The requested Firebase stack is not fulfilled by this adapted hosted implementation. If Firebase is mandatory for grading, a Firebase-backed version is still required.
- Listing images currently accept HTTPS image URLs. A hardened upload flow with file-type sniffing and size limits should be completed before production.
- Messaging is stored persistently but does not yet use live push updates.
- Full user suspension and category management are not yet implemented in the admin UI.
- Purchases and exchanges are enquiry-based. There is no checkout, escrow, shipping or payment processing.
- Terms and privacy pages are project templates and need institutional/legal review.

## College demo checklist
1. Sign in using a test email.
2. Browse categories and search for an item.
3. Create a listing and refresh to verify persistence.
4. Use a second test account to send an enquiry.
5. Save/remove favourites.
6. Open messages and notifications.
7. Submit a listing report.
8. Verify a normal user cannot access admin moderation.
9. Verify an authorized administrator can review a report.
10. Test Open Library search and its error handling.

## Open Library integration
GET https://openlibrary.org/search.json?q={query}&limit=8&fields=key,title,author_name,first_publish_year,isbn,cover_i
The server returns a normalized list of title, author, publication year, ISBN samples and cover URLs. If Open Library is unavailable, the endpoint returns a controlled error and manual listing creation remains available. Review Open Library's service guidance and attribution requirements before production use.

## Report outline
Abstract; problem statement; objectives; scope; existing system limitations; proposed system; architecture; schema and indexes; endpoint reference; authentication and authorization; external API integration; testing; screenshots; limitations; future work; conclusion.