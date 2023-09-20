import { Inject, Singleton } from 'typescript-ioc';
import { LocalStorageRepository } from '../repository/LocalStorageRepository';
import { LRUCache } from '../util/lru';

@Singleton
export class CombinedStorageService {
    @Inject
    private localStorageRepo: LocalStorageRepository;

    async get<T>(key: string, lruCache: LRUCache<T>): Promise<T | null> {
        // Try to get value from LRUCache
        let value = lruCache.get(key);
        if (value === null) {
            // If not present in LRUCache, get it from LocalStorage
            const valueRaw = await this.localStorageRepo.get(key);
            if (valueRaw) {
                value = JSON.parse(valueRaw) as T;
                lruCache.put(key, value);
            }
        }
        return value;
    }

    async set<T>(key: string, value: T, lruCache: LRUCache<T>): Promise<void> {
        // Save in LocalStorage
        await this.localStorageRepo.set(key, JSON.stringify(value));
        // Delete from LRUCache
        lruCache.delete(key); // Assuming there's a delete method on your LRUCache
    }

    setSingleThreaded<T>(key: string, value: T, lruCache: LRUCache<T>): void {
        // Save in LRUCache
        lruCache.put(key, value);
        // Update LocalStorage asynchronously without waiting
        setTimeout(() => {
            this.localStorageRepo.set(key, JSON.stringify(value));
        }, 0);
    }
}
