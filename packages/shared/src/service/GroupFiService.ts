import { Singleton } from "typescript-ioc";
import GroupFiSDKFacade, { SimpleDataExtended } from "groupfi-sdk-facade"
import { IMessage } from 'iotacat-sdk-core'
// IMMessage <-> UInt8Array
// IRecipient <-> UInt8Array
@Singleton
export class GroupFiService {
    private _bootstraped: boolean = false

    get isBootstraped() {
        return this._bootstraped
    }

    async bootstrap() {
        await GroupFiSDKFacade.bootstrap();
        this._bootstraped = true
    }
    async setupGroupFiMqttConnection(connect:any) {
        await GroupFiSDKFacade.setupMqttConnection(connect);
    }
    getObjectId(obj: Record<string, SimpleDataExtended>) {
        return GroupFiSDKFacade.getObjectId(obj)
    }
    async getInboxMessages(cotinuationToken?:string): Promise<{
        messageList: IMessage[],
        nextToken?: string | undefined
    }> {
        const res = await GroupFiSDKFacade.getInboxMessages(cotinuationToken);
        // log
        console.log('getInboxMessages', res);
        return res;
    }
    _offListenningNewMessage: (() => void) | undefined
    onNewMessage(callback: (message: IMessage) => void) {
        this._offListenningNewMessage = GroupFiSDKFacade.listenningNewMessage(callback);
    }
    offNewMessage(){
        this._offListenningNewMessage?.();
    }

    groupNameToGroupId(groupName: string) {
        return GroupFiSDKFacade.groupNameToGroupId(groupName)
    }

    async loadGroupMemberAddresses(groupId: string) {
        return await GroupFiSDKFacade.loadGroupMemberAddresses(groupId)
    }

    async loadGroupVotesCount(groupId: string) {
        return await GroupFiSDKFacade.loadGroupVotesCount(groupId)
    }

    async isGroupPublic(groupId: string) {
        return await GroupFiSDKFacade.isGroupPublic(groupId)
    }

    async getGroupVoteRes(groupId: string) {
        return await GroupFiSDKFacade.getGroupVoteRes(groupId)
    }

    async voteGroup(groupId: string, vote: number) {
        return await GroupFiSDKFacade.voteGroup(groupId, vote)
    }

    async unvoteGroup(groupId: string) {
        return await GroupFiSDKFacade.unvoteGroup(groupId)
    }
}