// Keep the type import as it is
import type { StorageAdaptor } from 'groupfi_chatbox_shared'; // Type import for StorageAdaptor

// Convert runtime module imports to CommonJS style
const fs = require('fs').promises;
const path = require('path');

export class FileStorageAdaptor implements StorageAdaptor {
    private storagePath: string;

    constructor(storagePath: string) {
        this.storagePath = storagePath;

        this.getFilePath = this.getFilePath.bind(this);
        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.remove = this.remove.bind(this);
    }

    // Helper function to get the full file path for a given key
    getFilePath(key: string): string {
        return path.join(this.storagePath, `${key}.json`);
    }

    // Get the value of a given key from the storage
    async get(key: string): Promise<string | null> {
        try {
            // log entering get method, key, this
            console.log('Entering get method', key, this);
            const filePath = this.getFilePath(key);
            const data = await fs.readFile(filePath, 'utf8');
            return data ? JSON.parse(data) : null;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // Return null if file doesn't exist
                return null;
            }
            throw error;
        }
    }

    // Set a value for a given key in the storage
    async set(key: string, value: string): Promise<void> {
        const filePath = this.getFilePath(key);
        const data = JSON.stringify(value);
        await fs.writeFile(filePath, data, 'utf8');
    }

    // Remove a key from the storage
    async remove(key: string): Promise<void> {
        try {
            const filePath = this.getFilePath(key);
            await fs.unlink(filePath); // Remove the file
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                // Ignore error if the file does not exist, otherwise rethrow it
                throw error;
            }
        }
    }
}
