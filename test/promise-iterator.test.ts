import { describe, it, expect } from 'vitest';
import { PromiseIterator } from '../src/promise-iterator';

describe('PromiseIterator', () => {

    describe('completion order', () => {

        it('should yield results in completion order, not input order', async () => {
            const promises = [
                new Promise<string>(r => setTimeout(() => r('slow'), 30)),
                new Promise<string>(r => setTimeout(() => r('fast'), 10)),
                new Promise<string>(r => setTimeout(() => r('medium'), 20)),
            ];

            const results: string[] = [];
            for await (const entry of new PromiseIterator(promises)) {
                if ('result' in entry) {
                    results.push(entry.result);
                }
            }

            expect(results).toEqual(['fast', 'medium', 'slow']);
        });

        it('should preserve original index', async () => {
            const promises = [
                new Promise<string>(r => setTimeout(() => r('slow'), 30)),
                new Promise<string>(r => setTimeout(() => r('fast'), 10)),
            ];

            const indices: number[] = [];
            for await (const { index } of new PromiseIterator(promises)) {
                indices.push(index);
            }

            expect(indices).toEqual([1, 0]); // fast (index 1) completes first
        });

    });

    describe('error handling', () => {

        it('should capture errors without stopping iteration', async () => {
            const promises = [
                Promise.resolve('success'),
                Promise.reject(new Error('failure')),
                Promise.resolve('another success'),
            ];

            const results = await new PromiseIterator(promises).all();

            expect(results).toHaveLength(3);

            const failure = results.find(r => 'error' in r);
            expect(failure).toBeDefined();
            expect('error' in failure! && failure.error).toBeInstanceOf(Error);
            expect('error' in failure! && (failure.error as Error).message).toBe('failure');

            expect(results.filter(r => 'result' in r)).toHaveLength(2);
        });

        it('should preserve non-Error rejection values', async () => {
            const promises = [
                Promise.reject('string error'),
            ];

            const [entry] = await new PromiseIterator(promises).all();

            expect('error' in entry && entry.error).toBe('string error');
        });

    });

    describe('all() method', () => {

        it('should collect all results', async () => {
            const promises = [
                Promise.resolve(1),
                Promise.resolve(2),
                Promise.resolve(3),
            ];

            const results = await new PromiseIterator(promises).all();

            expect(results).toHaveLength(3);
            const values = results.filter(r => 'result' in r).map(r => r.result);
            expect(values.sort()).toEqual([1, 2, 3]);
        });

    });

    describe('empty input', () => {

        it('should handle empty array', async () => {
            const results = await new PromiseIterator([]).all();
            expect(results).toEqual([]);
        });

    });

    describe('size property', () => {

        it('should return remaining count', async () => {
            const promises = [
                Promise.resolve(1),
                Promise.resolve(2),
                Promise.resolve(3),
            ];

            const iterator = new PromiseIterator(promises);
            expect(iterator.size).toBe(3);

            await iterator.next();
            expect(iterator.size).toBe(2);

            await iterator.next();
            expect(iterator.size).toBe(1);

            await iterator.next();
            expect(iterator.size).toBe(0);
        });

    });

    describe('single promise', () => {

        it('should handle single promise', async () => {
            const results = await new PromiseIterator([Promise.resolve('only')]).all();

            expect(results).toHaveLength(1);
            expect('result' in results[0] && results[0].result).toBe('only');
            expect(results[0].index).toBe(0);
        });

    });

    describe('undefined edge cases', () => {

        it('should distinguish resolved undefined from rejection', async () => {
            const promises = [
                Promise.resolve(undefined),
                Promise.reject(new Error('fail')),
            ];

            const results = await new PromiseIterator(promises).all();

            const success = results.find(r => 'result' in r);
            const failure = results.find(r => 'error' in r);

            expect(success).toBeDefined();
            expect('result' in success!).toBe(true);
            expect('result' in success! && success.result).toBeUndefined();

            expect(failure).toBeDefined();
            expect('error' in failure!).toBe(true);
        });

        it('should distinguish rejection with undefined from success', async () => {
            const promises = [
                Promise.reject(undefined),
            ];

            const [entry] = await new PromiseIterator(promises).all();

            expect('error' in entry).toBe(true);
            expect('result' in entry).toBe(false);
            expect('error' in entry && entry.error).toBeUndefined();
        });

    });

});