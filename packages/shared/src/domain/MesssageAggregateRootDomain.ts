import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
// serving as a facade for all message related domain, also in charge of bootstraping
// after bootstraping, each domain should subscribe to the event, then push event into array for buffering, and 
// triggering a handle function call to drain the array when there isn't any such function call in progress
@Singleton
export class MessageAggregateRootDomain {
    @Inject
    private iotaShimmerService: IotaShimmerService;
}