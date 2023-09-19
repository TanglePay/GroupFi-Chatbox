import { Inject, Singleton } from 'typescript-ioc';
import { LocalStorageRepository } from '../repository/LocalStorageRepository';
import { LRUCache } from '../util/lru';

@Singleton
export class CombinedStorageService {
    @Inject
    private localStorageRepo: LocalStorageRepository;

    async get(key: string, lruCache: LRUCache<string>): Promise<string | null> {
        // Try to get value from LRUCache
        let value = lruCache.get(key);
        if (value === null) {
            // If not present in LRUCache, get it from LocalStorage
            value = await this.localStorageRepo.get(key);
            if (value) {
                lruCache.put(key, value);
            }
        }
        return value;
    }

    async set(key: string, value: string, lruCache: LRUCache<string>): Promise<void> {
        // Save in LocalStorage
        await this.localStorageRepo.set(key, value);
        // Delete from LRUCache
        lruCache.delete(key); // Assuming there's a delete method on your LRUCache
    }

    setSingleThreaded(key: string, value: string, lruCache: LRUCache<string>): void {
        // Save in LRUCache
        lruCache.put(key, value);
        // Update LocalStorage asynchronously without waiting
        setTimeout(() => {
            this.localStorageRepo.set(key, value);
        }, 0);
    }
}
