# promise-iterator

Async iterator that yields promise results in completion order.

Works in Node.js, browsers, Deno — anywhere that supports async iterators. Zero dependencies.

## Why?

| Method | Fails fast? | Streams results? | Captures errors? |
|--------|-------------|------------------|------------------|
| `Promise.all` | Yes | No | No |
| `Promise.allSettled` | No | No | Yes |
| `PromiseIterator` | No | Yes | Yes |

`PromiseIterator` gives you results as they complete, without waiting for all promises to finish, and without failing on the first rejection.

## Installation

```bash
npm install promise-iterator
```

## Usage

### Basic iteration

```typescript
import { PromiseIterator } from 'promise-iterator';

const promises = [
    fetch('/api/slow').then(r => r.json()),
    fetch('/api/fast').then(r => r.json()),
    fetch('/api/medium').then(r => r.json()),
];

// Results arrive in completion order (fast first, then medium, then slow)
for await (const entry of new PromiseIterator(promises)) {
    if ('result' in entry) {
        console.log(`Request ${entry.index} completed:`, entry.result);
    } else {
        const message = entry.error instanceof Error ? entry.error.message : String(entry.error);
        console.log(`Request ${entry.index} failed:`, message);
    }
}
```

### Collect all results

```typescript
const results = await new PromiseIterator(promises).all();

// Results are in completion order, not input order.
// Use 'in' to narrow the discriminated union:
const successes = results.filter(r => 'result' in r);
const failures = results.filter(r => 'error' in r);

// To restore original order:
const sorted = [...results].sort((a, b) => a.index - b.index);
```

### Early exit

```typescript
for await (const { result } of new PromiseIterator(promises)) {
    if (result?.isWhatWeNeed) {
        break;
    }
}
// Note: remaining promises continue running in the background.
// PromiseIterator does not cancel them.
```

### Tracking progress

```typescript
const iterator = new PromiseIterator(promises);
console.log(`Starting with ${iterator.size} promises`);

for await (const { index } of iterator) {
    console.log(`Completed ${index}, ${iterator.size} remaining`);
}
```

## API

### `new PromiseIterator<T>(promises: Promise<T>[])`

Creates an async iterator over the given promises. An empty array is valid — the iterator completes immediately and `all()` returns `[]`.

### `PromiseResult<T>`

```typescript
type PromiseResult<T> =
    | { result: T; index: number }    // Resolved
    | { error: unknown; index: number }; // Rejected
```

Use `'result' in entry` or `'error' in entry` to narrow the union. Rejection values are preserved as-is.

### Properties

- `size` — Number of promises still pending. Decrements as promises settle.

### Methods

- `next()` — Returns the next completed result
- `all()` — Collects all results into an array (in completion order)

### Async iteration

```typescript
for await (const result of new PromiseIterator(promises)) {
    // ...
}
```

## License

LGPL-3.0

