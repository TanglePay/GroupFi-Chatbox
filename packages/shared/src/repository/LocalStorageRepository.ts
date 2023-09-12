import { Singleton } from "typescript-ioc";
// persist and retrieve data from local storage
// device abstraction should be injected by function call
@Singleton
export class LocalStorageRepository {

    async get(key: string): Promise<string> {
        return ""
    }
    // set
    async set(key: string, value: string) {
    }
}