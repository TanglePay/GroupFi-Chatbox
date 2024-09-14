import { Container } from 'typescript-ioc';
import { MessageAggregateRootDomain } from '../domain/MesssageAggregateRootDomain';

export class SetManager {
    private static instance: SetManager;
    private sets: Map<string, MessageAggregateRootDomain> = new Map();

    // Private constructor to enforce singleton nature
    private constructor() {}

    // Public method to get the single instance of SetManager
    public static getInstance(): SetManager {
        if (!SetManager.instance) {
            SetManager.instance = new SetManager();
        }
        return SetManager.instance;
    }

    // Get or create a set (MessageAggregateRootDomain) for a given address
    public getSet(address: string): MessageAggregateRootDomain {
        if (!this.sets.has(address)) {
            // Create and bind the domain to the address if it doesn't exist
            const messageDomain = Container.get(MessageAggregateRootDomain);
            this.sets.set(address, messageDomain);
        }
        return this.sets.get(address)!;
    }

    // List all currently managed addresses
    public listAddresses(): string[] {
        return Array.from(this.sets.keys());
    }

    // Clear a specific set by address
    public clearSet(address: string): void {
        this.sets.delete(address);
    }

    // Clear all sets
    public clearAllSets(): void {
        this.sets.clear();
    }
}
