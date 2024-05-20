import { Singleton } from "typescript-ioc";
import { IIncludesAndExcludes, PairX, UserMode } from "../types";
import EventEmitter from "events";
import { Map, List } from "immutable";
import { off } from "process";

@Singleton
export class SharedContext {
    private _state = Map<string, any>({
        includesAndExcludes: List<IIncludesAndExcludes>(),
        walletAddress: '',
        pairX: undefined as PairX | undefined,
        encryptedPairX: '',
        userBrowseMode: false,
        name: '',
        allGroupIds: List<string>(),
    });

    private _events = new EventEmitter();

    get isIncludeGroupNamesSet(): boolean {
        return (this._state.get('includesAndExcludes') as List<IIncludesAndExcludes>).size > 0;
    }

    get includesAndExcludes(): IIncludesAndExcludes[] {
        return (this._state.get('includesAndExcludes') as List<IIncludesAndExcludes>).toArray();
    }

    setIncludesAndExcludes(includesAndExcludes: IIncludesAndExcludes[], whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('includesAndExcludes', List(includesAndExcludes));
        if (!this._state.equals(previousState)) {
            console.log(`setIncludesAndExcludes: from ${previousState.get('includesAndExcludes')} to ${includesAndExcludes} by ${whoDidThis} because ${why}`);
            this._events.emit('includesAndExcludesChanged');
        } else {
            console.log(`setIncludesAndExcludes: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    onIncludesAndExcludesChanged(callback: () => void) {
        this._events.on('includesAndExcludesChanged', callback);
    }

    offIncludesAndExcludesChanged(callback: () => void) {
        this._events.off('includesAndExcludesChanged', callback);
    }

    clearIncludesAndExcludes(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('includesAndExcludes', List<IIncludesAndExcludes>());
        if (!this._state.equals(previousState)) {
            console.log(`clearIncludesAndExcludes: from ${previousState.get('includesAndExcludes')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearIncludesAndExcludes: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get isWalletConnected(): boolean {
        return !!this._state.get('walletAddress');
    }

    get walletAddress(): string {
        return this._state.get('walletAddress') as string;
    }

    setWalletAddress(walletAddress: string, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('walletAddress', walletAddress);
        if (!this._state.equals(previousState)) {
            console.log(`setWalletAddress: from ${previousState.get('walletAddress')} to ${walletAddress} by ${whoDidThis} because ${why}`);
            // emit event
            this._events.emit('walletAddressChanged');
        } else {
            console.log(`setWalletAddress: no change detected by ${whoDidThis} because ${why}`);
        }
    }
    onWalletAddressChanged(callback: () => void) {
        this._events.on('walletAddressChanged', callback);
    }
    offWalletAddressChanged(callback: () => void) {
        this._events.off('walletAddressChanged', callback);
    }
    clearWalletAddress(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('walletAddress', '');
        if (!this._state.equals(previousState)) {
            console.log(`clearWalletAddress: from ${previousState.get('walletAddress')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearWalletAddress: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get pairX(): PairX | undefined {
        return this._state.get('pairX') as PairX | undefined;
    }

    setPairX(pairX: PairX, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('pairX', pairX);
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged');
            console.log(`setPairX: from ${previousState.get('pairX')} to ${pairX} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearPairX(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('pairX', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearPairX: from ${previousState.get('pairX')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get encryptedPairX(): string | undefined {
        return this._state.get('encryptedPairX') as string | undefined;
    }

    setEncryptedPairX(encryptedPairX: string, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('encryptedPairX', encryptedPairX);
        if (!this._state.equals(previousState)) {
            console.log(`setEncryptedPairX: from ${previousState.get('encryptedPairX')} to ${encryptedPairX} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setEncryptedPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearEncryptedPairX(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('encryptedPairX', '');
        if (!this._state.equals(previousState)) {
            console.log(`clearEncryptedPairX: from ${previousState.get('encryptedPairX')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearEncryptedPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get userBrowseMode(): boolean {
        return this._state.get('userBrowseMode') as boolean;
    }

    setUserBrowseMode(userBrowseMode: boolean, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('userBrowseMode', userBrowseMode);
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged');
            console.log(`setUserBrowseMode: from ${previousState.get('userBrowseMode')} to ${userBrowseMode} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setUserBrowseMode: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    onLoginStatusChanged(callback: () => void) {
        this._events.on('loginStatusChanged', callback);
    }

    offLoginStatusChanged(callback: () => void) {
        this._events.off('loginStatusChanged', callback);
    }

    get userMode(): UserMode {
        return this.isLoggedIn ? 'login' : 'browse';
    }

    get isLoggedIn(): boolean {
        return !this._state.get('userBrowseMode') && !!this._state.get('pairX');
    }

    get isWaitForLogin(): boolean {
        return !this._state.get('pairX') && !!this._state.get('encryptedPairX');
    }

    get isRegistered(): boolean {
        return !!this._state.get('pairX') || !!this._state.get('encryptedPairX');
    }

    get isDidSet(): boolean {
        return !!this._state.get('name');
    }

    get name(): string {
        return this._state.get('name') as string;
    }

    setName(name: string, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('name', name);
        if (!this._state.equals(previousState)) {
            console.log(`setName: from ${previousState.get('name')} to ${name} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setName: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearName(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('name', '');
        if (!this._state.equals(previousState)) {
            console.log(`clearName: from ${previousState.get('name')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearName: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get isAllGroupIdsSet(): boolean {
        return (this._state.get('allGroupIds') as List<string>).size > 0;
    }

    get allGroupIds(): string[] {
        return (this._state.get('allGroupIds') as List<string>).toArray();
    }

    setAllGroupIds(allGroupIds: string[], whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('allGroupIds', List(allGroupIds));
        if (!this._state.equals(previousState)) {
            console.log(`setAllGroupIds: from ${previousState.get('allGroupIds')} to ${allGroupIds} by ${whoDidThis} because ${why}`);
            this._events.emit('allGroupIdsChanged');
        } else {
            console.log(`setAllGroupIds: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    onAllGroupIdsChanged(callback: () => void) {
        this._events.on('allGroupIdsChanged', callback);
    }
    offAllGroupIdsChanged(callback: () => void) {
        this._events.off('allGroupIdsChanged', callback);
    }

    clearAllGroupIds(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('allGroupIds', List<string>());
        if (!this._state.equals(previousState)) {
            console.log(`clearAllGroupIds: from ${previousState.get('allGroupIds')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearAllGroupIds: no change detected by ${whoDidThis} because ${why}`);
        }
    }
}
