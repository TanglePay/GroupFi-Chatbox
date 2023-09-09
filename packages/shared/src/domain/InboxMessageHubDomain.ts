import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
// maintain inbox message and anchor
@Singleton
export class InboxMessageHubDomain {
    @Inject
    private iotaShimmerService: IotaShimmerService;
}