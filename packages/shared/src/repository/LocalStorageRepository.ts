import { Singleton } from "typescript-ioc";
import { StorageAdaptor } from "../types";
// persist and retrieve data from local storage
// device abstraction should be injected by function call
@Singleton
export class LocalStorageRepository {
    private _storageAdaptor: StorageAdaptor;
    setStorageAdaptor(storageAdaptor: StorageAdaptor) {
        this._storageAdaptor = storageAdaptor;
    }
    async get(key: string): Promise<string|null> {
        return await this._storageAdaptor.get(key);
    }
    // set
    async set(key: string, value: string) {
        await this._storageAdaptor.set(key, value);
    }
    // remove
    async remove(key: string) {
        await this._storageAdaptor.remove(key);
    }
}