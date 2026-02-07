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
for await (const { result, error, index } of new PromiseIterator(promises)) {
    if (error === undefined) {
        console.log(`Request ${index} completed:`, result);
    } else {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`Request ${index} failed:`, message);
    }
}
```

### Collect all results

```typescript
const results = await new PromiseIterator(promises).all();

// Results are in completion order, not input order.
// Use 'result' in r to handle falsy values (0, "", null):
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
interface PromiseResult<T> {
    result?: T;       // Resolved value (if successful)
    error?: unknown;  // Rejection reason (if rejected)
    index: number;    // Original index in input array
}
```

**Error handling:** Rejection values are preserved as-is. Use `error instanceof Error` to narrow the type if needed.

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

