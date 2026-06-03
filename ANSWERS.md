# ANSWERS.md

## Q1. In-memory storage - production data layer

Right now orders live in a plain array inside `OrdersService`, which means every server restart wipes everything and you can't run more than one process.

For a real system I'd swap the array for a database. PostgreSQL makes sense here because orders and garments have a clear relational structure (one order many garments). I'd use TypeORM or Prisma to define `Order` and `Garment` as entities and inject a repository into the service. `findAll()` becomes `repo.find()`, mutations go through `repo.save()`.

A few other things I'd think about:
Wrap status updates in a transaction so a partial update can't leave data in a broken state
 Add indexes on fields you filter by (like `status`) once you have thousands of garments, a full table scan on every status query is going to be slow
If read load gets heavy, a read replica or a Redis cache for the order list makes sense
 The service methods should probably be async at that point since DB calls are async

## Q2. `{ error: string }` vs proper HTTP errors

The current `GET /api/orders/:id` returns a 200 with `{ error: "..." }` when the order isn't found. The problem is that HTTP clients (browsers, fetch, monitoring tools) look at the status code to decide if a request succeeded. A 200 with an error body looks like success.

This makes error handling on the frontend awkward you have to inspect the body shape instead of just checking `res.ok`.

The fix is to throw `NotFoundException` from NestJS, which gives back a proper 404. I did this for the new endpoints I added. For a real POS API I'd also:
 Use a consistent error shape everywhere (NestJS's default `{ statusCode, message, error }` is fine)
 Add a global exception filter for unexpected errors so they don't leak stack traces to clients
Document the possible error codes per endpoint

## Q3. Scaling the frontend beyond a single fetch

The current `useEffect` + `fetch` approach works fine for one call, but gets messy once you have filters, pagination, and multiple endpoints you end up with a lot of duplicated loading/error state and race conditions.

A few things I'd change:
 **React Query (TanStack Query)** for data fetching. It handles caching, background refetches, and loading/error states automatically. You stop thinking about `useEffect` for data and just declare what data a component needs.
 Move the API calls into a separate `api.ts` file rather than writing `fetch('http://localhost:3001/...')` inline everywhere. Centralizing the base URL and headers means one change instead of ten when the API moves.
 For filter state that needs to be shareable or bookmarkable, put it in the URL (`?status=ready`) instead of component state.
 If the app gets bigger, something like Zustand for shared client state but I'd resist adding that until there's a real need.

## Q4. Missing fields and domain model gaps

Looking at the current `Order` and `Garment` types, a few things stand out:

**On `Order`:**
 No `status` field at the order level. You'd want something like `open | in_progress | ready | closed | cancelled` so staff can see at a glance without checking every garment.
 No customer contact info (phone/email) needed for pickup notifications.
 No `dueDate` dry cleaning stores promise a ready time and need to track SLA breaches.
 No payment info: `totalAmount`, `amountPaid`, `paymentStatus`.

**On `Garment`:**
 No `serviceType` (dry clean / wash / press / alterations) this affects pricing and workflow routing.
 No `price` field you can't do billing without it.
 No `notes` field staff often write "remove stain near collar" etc.
 No `updatedAt` timestamp  useful for tracking how long something has been in a status.

**For prepaid packages:**
I'd add a `Package` entity: `{ id, customerId, totalCredits, usedCredits }`. When creating an order you deduct credits and link the order to the package. If credits run out you fall back to cash billing.

## Q5. Risks of AI-generated code in production

The main risk I see is that AI-generated code often looks correct but hasn't been thought through for edge cases. Specific things I'd check in this codebase:

 **Mutation on the shared array**: `updateGarmentStatus` mutates the garment object in place. That's fine here, but in a concurrent environment it's a data race waiting to happen. AI tools don't always flag this.
 **Missing input validation**: The PATCH endpoint validates the status value but doesn't check the format of `orderId` or `garmentId`. A malformed ID won't cause a bug now, but it would if you moved to a real DB with UUID validation.
 **No tests**: AI-generated code rarely comes with tests. I'd write unit tests for `updateGarmentStatus` and `getGarmentStatusSummary` before shipping especially the edge cases like empty orders, duplicate garment IDs, invalid status transitions.
 **Review practice**: I'd read every function line by line, not just run it and see if it works. Then write at least a few integration tests hitting the actual endpoints before merging.

## Q6. Real-time garment status updates

The current setup is pure REST you only see updates when you refresh or refetch. For a live board showing garments moving through statuses, a few options:

**Short polling**: simplest change `setInterval` on the frontend calling `GET /api/orders` every few seconds. Works fine for a small number of clients, but wastes requests when nothing has changed.

**Server-Sent Events (SSE)**: the server pushes events to connected clients when a status changes. One directional, works over HTTP, no extra library needed. Good fit here since the client only needs to receive updates, not send them.

**WebSockets**: bidirectional, lower latency, but more complex to set up and scale. Probably overkill for a status board.

**What I'd pick**: SSE with a fallback to polling. Add a `GET /api/events` endpoint using NestJS's `@Sse()` decorator that emits a `garment-updated` event whenever `updateGarmentStatus` is called. On the frontend, open an `EventSource` connection and update local state when events arrive. If the connection drops, fall back to polling every 10s.

The main tradeoff is that SSE connections are stateful you need sticky sessions or a pub/sub layer (like Redis) if you run multiple server instances.
