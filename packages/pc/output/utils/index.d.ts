import { StorageAdaptor } from 'groupfi_trollbox_shared';
export declare class LocalStorageAdaptor implements StorageAdaptor {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
export declare function classNames(...classes: unknown[]): string;
export declare function timestampFormater(second: number | undefined, hour12?: boolean): string | undefined;
//# sourceMappingURL=index.d.ts.map