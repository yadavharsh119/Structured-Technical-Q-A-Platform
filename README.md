# DevPerspective — Developer Knowledge Platform

A specialized structured developer Q&A platform where contributors provide **one structured, experience-based perspective per question**, eliminating discussion noise and debates.

---

## 🌟 Key Features Implemented

1. **Authentication & Profiles**
   - User registration with experience level (`Junior`, `Mid-level`, `Senior`, `Lead`, `Principal`), years of experience, and skills multi-selection.
   - Password strength evaluation & real-time client-side validation.
   - Demo accounts on the login screen for 1-click test sign-in (`Sarah (Senior)`, `Tom (Junior)`).
   - Profile pages with bio editing, perspective contribution count, question count, and upvote statistics.

2. **Home & Dashboard Feed**
   - Hero banner for visitors with stats summary (Questions, Perspectives, Contributors).
   - Recent & Trending sorting switches.
   - Instant search with debounced filtering and keyboard shortcut (`⌘K` / `Ctrl+K`).
   - Sticky sidebar featuring platform statistics and quick-access topics.

3. **Topics Directory & Detail**
   - Dedicated Topic cards with question counts and descriptions.
   - Topic detail page (`/topics/[slug]`) filtering relevant questions.

4. **Ask / Create Question**
   - Multi-attribute question builder: Title, Intent/Type (Experience-based, Comparison, Best Practice, Career advice), Context, and Topic picker.
   - Character count guards and validation.
   - Live Preview tab allowing instant formatting inspection prior to posting.

5. **Question Details & Perspectives**
   - Full question context with author metadata and badges.
   - Perspectives ordered by community upvotes.
   - Related questions section.

6. **Structured Perspective Submission**
   - Enforces **exactly one perspective per developer per question**.
   - Standardized 5-section framework:
     1. **Background & Context**
     2. **What Actually Happened (Experience)**
     3. **What Worked**
     4. **What Didn't Work & Pitfalls to Avoid**
     5. **Direct Advice & Actionable Takeaways**

7. **Voting & Community Validation**
   - Upvote mechanism with optimistic state updates and pop animation.
   - Self-voting prevention.

---

## 🚀 Running the Project

```bash
cd devperspective
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
