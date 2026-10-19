# User Journey: Myflix (personal Netflix)

**What it is:** My own version of Netflix. Users save shows to My List, rate them 1–5 stars, comment on them, track what they're watching, add their own movies and series, and group titles into named lists.

**Problem:** What I've watched, what I thought of it and what I want to watch next is scattered across streaming apps, notes and group chats. Nothing keeps my ratings and thoughts in one place.

**User:** One type: a viewer keeping track of their own shows. Each person has an account and sees only their own list, ratings, comments, titles and lists.

## The journey

0. **Accounts** (added in the authentication lecture):
   - **Not logged in** and opens the app → goes to **Log in**.
   - **Register**: name, email, password (at least 6 characters) → lands on an empty **My List**, with the catalog in the "Add to My List" row below it.
     - Email already used → "That email already has an account. Log in instead."
   - **Log in**: email + password → **My List**, with exactly what they saved last time, on any device.
     - Wrong email or password → "Wrong email or password" (never says which one).
   - **Who am I?** The header always shows their name and a **Log out** button.
   - **Refresh** while logged in → still logged in, same list (the session is saved in the browser).
   - **Log out** → back to Log in; the saved session and this browser's copy of their list are removed, so the next person on this computer sees nothing of theirs.
1. **Opens the app** → lands on **My List**. The header shows MYFLIX and the nav (Home, TV Shows, Movies, New & Popular, My List; only My List works so far). Under the title: stats (titles, average rating, comments) and the sync status ("Synced to cloud").
   - Empty list: "Your list is empty. Add something from the row below."
2. **Adds a show**: in the **Add to My List** row, taps **+** on a poster → it appears at the top of My List as "Want to watch".
   - Everything already added → "Everything in the catalog is already on your list."
3. **Filters and sorts**: chips All · Want to watch · Watching · Finished (each with a count) and a sort menu (Recently added · Highest rated · Title A–Z).
   - Filter shows nothing → "Nothing under "Watching" yet."
4. **Taps a show card** → the **show dialog** opens (Escape or × closes it):
   - **Rates it** 1–5 stars; tapping the same star again clears the rating.
   - **Sets status**: Want to watch · Watching · Finished.
   - **Comments**: writes a comment (max 500 characters), can tick **Spoiler** so it's hidden until revealed, and can edit or delete their own comments.
     - No comments yet → "No comments yet. Jot down your thoughts after an episode."
   - **Your lists**: toggles which named lists the show is in, or makes a "New list with this title".
   - **Remove from My List** → the show and its comments are gone from My List.
5. **Adds their own title**: taps **+ Add your own title** → the **Add a movie or show** dialog: title, Movie or Series, year, seasons (series only), genre (from the catalog's genres), rating (TV-14, PG-13, …), synopsis (optional), and "Also add it to My List".
   - "Only you can see the titles you add."
   - **Mistakes:** empty title → "Give it a title." Year outside 1900–2100 → "Year must be between 1900 and 2100." A series with 0 seasons → "A series needs at least 1 season."
   - Their titles show "Added by you" in the show dialog, which also has **Delete this title from Myflix** (it's removed from My List and from every list too).
6. **Your lists**: creates a named list ("Comfort shows", "Watch with Dad", …), renames it, deletes it, and adds or removes titles in it.
   - Empty or duplicate name → the button stays disabled; duplicate → "You already have a list called "Faves"." (case doesn't matter).
   - Empty list → "Nothing here yet. Pick a title below, or use "Your lists" when you open a show."

## Data rules

- All data lives in Supabase (Postgres), with a copy in the browser (`localStorage`) so the page loads instantly and works offline. Every read and write goes through `front-end/src/lib/` (`listSync.js`, `librarySync.js`, `session.js`); components never call Supabase.
- Every saved row belongs to the logged-in user (`user_id`, or `created_by` for their own titles). The database fills it in with `auth.uid()` and enforces it with RLS; the app never sends a user id.
- A profile (name, avatar color) is created automatically when someone registers.
- The catalog (genres + the built-in shows from `src/data/shows.js`) is shared: every logged-in user can read it, nobody can change it from the app. A user's own titles are private to them.
- A comment belongs to one of the user's My List entries; a list item belongs to one of the user's own lists and can only point at a show they can see.
- No seed data for users: a new account starts empty. The old test rows in `supabase/backups/` belonged to anonymous accounts and are not re-imported.
