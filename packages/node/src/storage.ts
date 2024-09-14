import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageAdaptor } from 'groupfi_chatbox_shared'; // Assuming the interface exists in this package

export class FileStorageAdaptor implements StorageAdaptor {
    private storagePath: string;

    constructor(storagePath: string) {
        this.storagePath = storagePath;
    }

    // Helper function to get the full file path for a given key
    private getFilePath(key: string): string {
        return path.join(this.storagePath, `${key}.json`);
    }

    // Get the value of a given key from the storage
    async get(key: string): Promise<string | null> {
        try {
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
