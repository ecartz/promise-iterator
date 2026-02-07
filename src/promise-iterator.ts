/**
 * Result from a resolved or rejected promise.
 */
export interface PromiseResult<T> {
    /** The resolved value (if successful) */
    result?: T;
    /** The rejection reason (if rejected) — preserved as-is from the promise */
    error?: unknown;
    /** The original index in the input array */
    index: number;
}

/**
 * Async iterator that yields promise results in completion order.
 *
 * Unlike `Promise.all`, it doesn't fail fast on rejection.
 * Unlike `Promise.allSettled`, it yields results as they complete rather than waiting for all.
 *
 * @example
 * ```typescript
 * const promises = [
 *     fetch('/api/slow').then(r => r.json()),
 *     fetch('/api/fast').then(r => r.json()),
 *     fetch('/api/fails').then(r => r.json()),
 * ];
 *
 * for await (const { result, error, index } of new PromiseIterator(promises)) {
 *     if (error === undefined) {
 *         console.log(`Promise ${index} resolved:`, result);
 *     } else {
 *         const message = error instanceof Error ? error.message : String(error);
 *         console.log(`Promise ${index} failed:`, message);
 *     }
 * }
 * ```
 *
 * @template T - The resolved type of the promises
 */
export class PromiseIterator<T> implements AsyncIterator<PromiseResult<T>> {

    private readonly pending: Map<number, Promise<PromiseResult<T>>>;

    /**
     * Creates a new PromiseIterator.
     *
     * @param promises - Array of promises to iterate over
     */
    public constructor(promises: ReadonlyArray<Promise<T>>) {
        this.pending = new Map(
            promises.map((promise, index) => [
                index,
                promise.then(
                    (result) => ({ result, index }),
                    (error) => ({ error, index })
                ),
            ])
        );
    }

    /**
     * Returns the next completed promise result.
     */
    public async next(): Promise<IteratorResult<PromiseResult<T>>> {
        if (this.pending.size === 0) {
            return { done: true, value: undefined };
        }

        const result = await Promise.race(Array.from(this.pending.values()));
        this.pending.delete(result.index);

        return { value: result, done: false };
    }

    /**
     * Makes this class iterable with `for await...of`.
     */
    public [Symbol.asyncIterator](): AsyncIterator<PromiseResult<T>> {
        return this;
    }

    /**
     * Collects all results into an array (in completion order).
     *
     * @returns Array of all results in the order they completed
     */
    public async all(): Promise<Array<PromiseResult<T>>> {
        const results: Array<PromiseResult<T>> = [];
        for await (const result of this) {
            results.push(result);
        }

	return results;
    }

    /**
     * Returns the number of pending promises.
     */
    public get size(): number {
        return this.pending.size;
    }

}

