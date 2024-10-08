import { Inject, Singleton } from 'typescript-ioc'
import { ICycle, IRunnable } from '../types'
import { SharedContext } from './SharedContext'

export const AGGREGATOR_URL = 'https://agg.iotabee.com'

@Singleton
export class AggregatorDomain {
  @Inject
  private _context: SharedContext

  // 支持的币对合约列表
  private _pairs: Array<any>

  // 获取比对合约列表
  async getPairs(): Promise<Array<any>> {
    return this._pairs
  }

  // 判断token是否支持购买，请求接口获取支持的链。
  async checkToken(token: string): Promise<boolean> {
    if (this._pairs) {
      const pair = this._pairs.find((item: any) => item.token === token)
      if (pair) {
        return true
      }
    }
    return true
  }

  // 校验授权
  async checkTokenAllowance(coin: string, amount?: string) {}

  // 校验swap链路
  async checkSwapRoute(
    from: string,
    to: string,
    amount: string
  ): Promise<boolean> {
    return true
  }

  //购买
  async sendTransaction(options: unknown): Promise<unknown> {
    let result
    return result
  }
}
