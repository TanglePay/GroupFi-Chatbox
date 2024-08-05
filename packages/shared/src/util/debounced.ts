import EventEmitter from "events";

export class DebouncedEventEmitter extends EventEmitter {
    private _debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private _defaultDelay: number;

    constructor(defaultDelay: number) {
        super();
        this._defaultDelay = defaultDelay;
    }

    emit(event: string, ...args: any[]): boolean {
        if (this._debounceTimers.has(event)) {
            clearTimeout(this._debounceTimers.get(event)!);
        }

        const timer = setTimeout(() => {
            super.emit(event, ...args);
            this._debounceTimers.delete(event);
        }, this._defaultDelay);

        this._debounceTimers.set(event, timer);

        return true;
    }
}