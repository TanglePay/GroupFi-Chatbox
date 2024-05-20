import { Singleton } from "typescript-ioc";
import { PairX, UserMode } from "../types";
import EventEmitter from "events";


@Singleton
export class SharedContext {
    _includeGroupNames?: string[]
    get isIncludeGroupNamesSet(): boolean {
        return !!this._includeGroupNames;
    }
    get includeGroupNames(): string[] {
        return this._includeGroupNames || [];
    }

    setIncludeGroupNames(includeGroupNames: string[], whoDidThis: string, why: string) {
        const previousIncludeGroupNames = this._includeGroupNames;
        this._includeGroupNames = includeGroupNames;
        console.log(`setIncludeGroupNames: from ${previousIncludeGroupNames} to ${includeGroupNames} by ${whoDidThis} because ${why}`);
    }

    clearIncludeGroupNames(whoDidThis: string, why: string) {
        const previousIncludeGroupNames = this._includeGroupNames;
        this._includeGroupNames = undefined;
        console.log(`clearIncludeGroupNames: from ${previousIncludeGroupNames} to undefined by ${whoDidThis} because ${why}`);
    }


    _walletAddress?: string;
    // get isWalletConnected(): boolean {
    get isWalletConnected(): boolean {
        return !!this._walletAddress;
    }
    get walletAddress(): string {
        return this._walletAddress || '';
    }

    setWalletAddress(walletAddress: string, whoDidThis: string, why: string) {
        const previousWalletAddress = this._walletAddress;
        this._walletAddress = walletAddress;
        console.log(`setWalletAddress: from ${previousWalletAddress} to ${walletAddress} by ${whoDidThis} because ${why}`);
    }

    clearWalletAddress(whoDidThis: string, why: string) {
        const previousWalletAddress = this._walletAddress;
        this._walletAddress = undefined;
        console.log(`clearWalletAddress: from ${previousWalletAddress} to undefined by ${whoDidThis} because ${why}`);
    }

    _pairX?: PairX

    // same sets of functions for pairX
    get pairX(): PairX | undefined {
        return this._pairX;
    }

    setPairX(pairX: PairX, whoDidThis: string, why: string) {
        const previousPairX = this._pairX;
        this._pairX = pairX;
        console.log(`setPairX: from ${previousPairX} to ${pairX} by ${whoDidThis} because ${why}`);
    }

    clearPairX(whoDidThis: string, why: string) {
        const previousPairX = this._pairX;
        this._pairX = undefined;
        console.log(`clearPairX: from ${previousPairX} to undefined by ${whoDidThis} because ${why}`);
    }

    _encryptedPairX?: string
    // same sets of functions for encryptedPairX
    get encryptedPairX(): string | undefined {
        return this._encryptedPairX;
    }

    setEncryptedPairX(encryptedPairX: string, whoDidThis: string, why: string) {
        const previousEncryptedPairX = this._encryptedPairX;
        this._encryptedPairX = encryptedPairX;
        console.log(`setEncryptedPairX: from ${previousEncryptedPairX} to ${encryptedPairX} by ${whoDidThis} because ${why}`);
    }

    clearEncryptedPairX(whoDidThis: string, why: string) {
        const previousEncryptedPairX = this._encryptedPairX;
        this._encryptedPairX = undefined;
        console.log(`clearEncryptedPairX: from ${previousEncryptedPairX} to undefined by ${whoDidThis} because ${why}`);
    }


    _userBrowseMode: boolean = false

    get userBrowseMode(): boolean {
        return this._userBrowseMode;
    }

    setUserBrowseMode(userBrowseMode: boolean, whoDidThis: string, why: string) {
        const previousUserBrowseMode = this._userBrowseMode;
        this._userBrowseMode = userBrowseMode;
        console.log(`setUserBrowseMode: from ${previousUserBrowseMode} to ${userBrowseMode} by ${whoDidThis} because ${why}`);
    }


    get userMode(): UserMode {
        return this.isLoggedIn ? 'login' : 'browse';
    }
    get isLoggedIn(): boolean {
        return !this._userBrowseMode && !!this._pairX;
    }

    get isWaitForLogin(): boolean {
        // no pairX, has encryptedPairX
        return !this._pairX && !!this._encryptedPairX;
    }

    get isRegistered(): boolean {
        // has pairX, or has encryptedPairX
        return !!this._pairX || !!this._encryptedPairX;
    }

    _name?: string
    get isDidSet(): boolean {
        return !!this._name;
    }

    get name(): string {
        return this._name || '';
    }

    setName(name: string, whoDidThis: string, why: string) {
        const previousName = this._name;
        this._name = name;
        console.log(`setName: from ${previousName} to ${name} by ${whoDidThis} because ${why}`);
    }

    clearName(whoDidThis: string, why: string) {
        const previousName = this._name;
        this._name = undefined;
        console.log(`clearName: from ${previousName} to undefined by ${whoDidThis} because ${why}`);
    }

    _allGroupIds?: string[]
    get isAllGroupIdsSet(): boolean {
        return !!this._allGroupIds;
    }

    get allGroupIds(): string[] {
        return this._allGroupIds || [];
    }

    setAllGroupIds(allGroupIds: string[], whoDidThis: string, why: string) {
        const previousAllGroupIds = this._allGroupIds;
        this._allGroupIds = allGroupIds;
        console.log(`setAllGroupIds: from ${previousAllGroupIds} to ${allGroupIds} by ${whoDidThis} because ${why}`);
        this._events.emit('allGroupIdsChanged');
    }

    onAllGroupIdsChanged(callback: () => void) {
        this._events.on('allGroupIdsChanged', callback);
    }

    clearAllGroupIds(whoDidThis: string, why: string) {
        const previousAllGroupIds = this._allGroupIds;
        this._allGroupIds = undefined;
        console.log(`clearAllGroupIds: from ${previousAllGroupIds} to undefined by ${whoDidThis} because ${why}`);
    }
    _events: EventEmitter = new EventEmitter()


}