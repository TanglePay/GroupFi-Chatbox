import { clearTimeout } from "timers";
import { sleep } from "./sleep";

export interface IContext {
    get shouldPause(): boolean;
    get shouldStop(): boolean;
    stopedCallback(): void;
}

export class ThreadHandler {
    private _shouldStopAfterCurrent: boolean = false
    private _shouldDrainAndStop: boolean = false
    private _shouldPause: boolean = true
    private _pauseInterval: number;
    private _pauseResolve?: () => void
    private _stoppedCallback?: () => void
    private _thread?: NodeJS.Timeout
    private _poll: () => Promise<boolean>

    constructor(poll: () => Promise<boolean>, private name: string, pauseInterval: number) {
        this._poll = poll
        this._pauseInterval = pauseInterval
    }

    async start() {
        this._shouldStopAfterCurrent = false
        this._shouldDrainAndStop = false
        // Ensure shouldPause is reset on start
        this._shouldPause = false
        this._thread = setTimeout(() => {
            this.loop()
        }, 0)
    }

    async pause() {
        this._shouldPause = true
    }

    async resume() {
        this._shouldPause = false
        // Awake the thread if it is paused
        this.forcePauseResolve()
    }

    async stopAfterCurrent() {
        this._shouldStopAfterCurrent = true
        await this._stop()
    }

    async drainAndStop() {
        this._shouldDrainAndStop = true
        await this._stop()
    }

    async _stop() {
        if (this._shouldPause) {
            this.resume()
        }
        const ps = new Promise<void>((resolve) => {
            this._stoppedCallback = resolve
            setTimeout(() => {
                resolve()
                this._stoppedCallback = undefined
            }, 3000)
        })
        await ps
        clearTimeout(this._thread)
        this._thread = undefined
    }

    async destroy() {
        this._thread = undefined
    }

    // Allow external control to resolve the pause
    forcePauseResolve() {
        if (this._pauseResolve) {
            this._pauseResolve()
            this._pauseResolve = undefined
        }
    }

    private async loop(): Promise<void> {
        // log loop started
        console.log(`loop ${this.name} started`)
        for (;;) {
            try {
                if (this._shouldPause) {
                    // log loop paused
                    // console.log(`loop ${this.name} paused`)
                    await sleep(1000)
                    continue
                }

                const noItemsToProcess = await this._poll()

                if (noItemsToProcess) {
                    if (this._shouldDrainAndStop || this._shouldStopAfterCurrent) {
                        console.log(`loop ${this.name} stopped because there are no items to process`)
                        break;
                    }

                    // If there are no items to process, pause the loop
                    // console.log(`loop ${this.name} paused because there are no items to process`)
                    const ps = new Promise<void>((resolve) => {
                        this._pauseResolve = resolve
                        setTimeout(() => {
                            this.forcePauseResolve()
                        }, this._pauseInterval)
                    })
                    await ps
                    continue
                }

                if (this._shouldStopAfterCurrent) {
                    console.log(`loop ${this.name} stopping after current item`)
                    break;
                }

            } catch (error) {
                console.error(`Unhandled error in poll method of ${this.name}:`, error)
            }
        }
        if (this._stoppedCallback) {
            this._stoppedCallback()
        }
    }
}

export class Thread implements IContext{
    private _thread: NodeJS.Timeout | undefined;
    private _worker: (context:IContext) => void;
    private _shouldStop: boolean = false;
    private _shouldPause: boolean = true;
    get shouldPause() {
        return this._shouldPause;
    }
    get shouldStop() {
        return this._shouldStop;
    }
    constructor(worker: (context:IContext) => void) {
        this._worker = worker;
    }
    private _stoppedCallback?: () => void;
    stopedCallback(): void {
        if (this._stoppedCallback) {
            this._stoppedCallback();
        }
    }

    async start() {
        this._thread = setTimeout(()=>{this._worker(this)}, 0)
    }
    async pause() {
        this._shouldPause = true;
    }
    async resume() {
        this._shouldPause = false;
    }
    async stop() {
        this._shouldStop = true;
        const ps = new Promise<void>((resolve) => {
            this._stoppedCallback = resolve;
            setTimeout(() => {
                resolve();
                this._stoppedCallback = undefined
            }, 3000);
        });
        await ps;
        clearTimeout(this._thread!);
        this._thread = undefined;
    }

    
}

export class ThreadHandlerOld {
    private _thread?: Thread;
    private _pauseInterval: number;
    private _pauseResolve?: () => void;

    constructor(private poll: (context: IContext) => Promise<boolean>, private name: string, pauseInterval: number) {
        this._pauseInterval = pauseInterval;
    }

    async start() {
        this._thread = new Thread(this.loop.bind(this));
        this._thread.start();
    }

    async resume() {
        this._thread!.resume();
    }

    async pause() {
        if (!this._thread) return
        this._thread!.pause();
    }

    async stop() {
        if (!this._thread) return
        await this._thread!.stop();
    }

    async destroy() {
        this._thread = undefined;
    }

    // Allow external control to resolve the pause
    forcePauseResolve() {
        if (this._pauseResolve) {
            this._pauseResolve();
            this._pauseResolve = undefined;
        }
    }

    private async loop(context: IContext): Promise<void> {
        // log loop started
        console.log(`loop ${this.name} started`);
        for (;;) {
            try {
                if (context.shouldStop) {
                    // log loop paused
                    console.log(`loop ${this.name} stoped`);
                    if (this._thread) {
                        this._thread.stopedCallback()
                    }
                    break;
                }
                if (context.shouldPause) {
                    // log loop paused
                    console.log(`loop ${this.name} paused`);
                    await sleep(1000);
                    continue;
                }
                const shouldPause = await this.poll(context);
                if (shouldPause) {
                    const ps = new Promise<void>((resolve) => {
                        this._pauseResolve = resolve;
                        setTimeout(() => {
                            this.forcePauseResolve();
                        }, this._pauseInterval);
                    });
                    await ps;
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
}
