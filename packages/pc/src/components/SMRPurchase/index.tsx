import { useState, useEffect } from 'react'
import { LoadingModal } from 'components/Shared'
import { ModeInfo, useMessageDomain } from 'groupfi_trollbox_shared'
import { classNames } from 'utils'
import ErrorCircle from 'public/icons/error-circle.svg'
import ErrorCancel from 'public/icons/error-cancel.svg'

import TanglePayLogoSVG from 'public/icons/tanglepay-logo.svg'
import RightSVG from 'public/icons/right.svg'
import Web3 from 'web3'
import Decimal from 'decimal.js'

function checkAmount(amount: string): string | undefined {
  if (amount === '') {
    return 'Please enter a number.'
  }
  const amountNumber = Number(amount)
  if (isNaN(amountNumber)) {
    return 'Please enter a number.'
  }
  // if (amountNumber < 10) {
  //   return `Amount can't be lower than 10.`
  // }
  if (amountNumber > 1000) {
    return `Amount can't be greater than 1000.`
  }
  return undefined
}

export default function SMRPurchase(props: {
  address: string
  nodeId: number | undefined
  // enterGuestMode: () => void
  // modeInfo?: ModeInfo
  // onPurchaseFinish: () => void
}) {
  const { nodeId } = props
  const { messageDomain } = useMessageDomain()

  const groupFiService = messageDomain.getGroupFiService()

  const [amount, setAmount] = useState<string>('')

  const [error, setError] = useState<string | undefined>(undefined)

  const [loading, setLoading] = useState<boolean>(false)

  const [priceInfo, setPriceInfo] = useState<
    { price: string; deci: number; contract: string } | undefined
  >(undefined)

  const fetchPrice = async () => {
    const res = await groupFiService.fetchSMRPrice(nodeId!)
    console.log('===>fetchPrice', res)
    setPriceInfo(res)
  }

  useEffect(() => {
    if (nodeId) {
      setPriceInfo(undefined)
      fetchPrice()
    }
  }, [nodeId])

  const getSpend = () => {
    if (priceInfo === undefined) {
      return ''
    }
    const targetAmount = Number(amount)
    const price = new Decimal(priceInfo.price).div(new Decimal('1e18'))

    if (targetAmount == 0 || isNaN(targetAmount)) {
      return price.toFixed()
    }
    return new Decimal(targetAmount)
      .times(new Decimal('1e6'))
      .times(price)
      .toFixed()
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (error !== undefined) {
      timer = setTimeout(() => {
        setError(undefined)
      }, 1000 * 5)
    }
    return () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
    }
  }, [error])

  const nodeInfo = nodeId ? groupFiService.getTpNodeInfo(nodeId) : undefined

  return (
    <div className={classNames('px-5 h-full')}>
      <div className={classNames('flex flex-row pt-6')}>
        <img src={TanglePayLogoSVG} className={classNames('w-7 h-7')} />
        <h3
          className={classNames(
            'leading-7 text-2xl font-bold text-[#3671EE] ml-3'
          )}
        >
          GroupFi
        </h3>
      </div>
      <div className={classNames('font-bold text-[#333] mt-6')}>
        Free Shimmer Proxy
        <img
          src={RightSVG}
          className={classNames('w-4 h-4 ml-2 inline-block')}
        />
      </div>
      <div className={classNames('mt-1')}>
        The Shimmer proxy is used for message sending
      </div>
      <div className={classNames('text-[#333] font-bold mt-5')}>Buy SMR</div>
      <div className={classNames('mt-1')}>
        <input
          id="amount"
          name="amount"
          value={amount}
          autoFocus
          autoComplete={'off'}
          onChange={(event) => {
            const value = event.target.value
            setAmount(value)
          }}
          placeholder="Input amount"
          className={classNames(
            'w-[136px] h-7 pr-1 text-right focus:outline-0 border-b py-1.5 text-gray-900 shadow-sm placeholder:text-gray-400 placeholder:pr-7'
          )}
        />
        <span className={classNames('text-[#333] ml-2')}>SMR</span>
      </div>
      <div className={classNames('mt-2 flex flex-row items-center')}>
        Spend
        <span className={classNames('pl-2 pr-1 text-[#3671EE]')}>
          {getSpend()}
        </span>
        {nodeInfo !== undefined && (
          <>
            {nodeInfo?.token}
            <span className={classNames('ml-1 text-xs')}>
              ({nodeInfo?.name})
            </span>
          </>
        )}
      </div>
      <div className={classNames('mt-5')}>
        The SMR is used for GroupFi message storage and will be sent to your
        shimmer proxy.
      </div>
      <div className={classNames('mt-3')}>
        The SMR is refundable when messages are expired. lt is a recurrent
        resource and never be consumed.
      </div>
      {error !== undefined && (
        <div
          className={classNames(
            'flex w-full mt-2 flex-row py-2.5 text-base bg-[#D53554]/5 rounded-xl text-[#D53554]'
          )}
        >
          <img src={ErrorCircle} className={classNames('ml-3 mr-2')} />
          <div className={'flex-1'}>
            <div>
              <span className={classNames('font-bold mr-1')}>Error:</span>
              <span className={classNames('text-sm')}>{error}</span>
            </div>
          </div>
          <img
            onClick={() => setError(undefined)}
            src={ErrorCancel}
            className={classNames('mr-3 cursor-pointer')}
          />
        </div>
      )}
      <div
        className={classNames('absolute bottom-0')}
        style={{ width: 'calc(100% - 40px)' }}
      >
        <button
          className={classNames('w-full bg-[#3671EE] rounded-xl py-3')}
          onClick={async () => {
            try {
              if (
                priceInfo === undefined ||
                nodeId === undefined ||
                nodeInfo === undefined
              ) {
                return
              }
              const error = checkAmount(amount)
              if (error !== undefined) {
                setError(error)
                return
              }
              setLoading(true)
              const web3 = new Web3(nodeInfo.url)

              const targetAmount = new Decimal(amount)
                .times(new Decimal('1e6'))
                .toFixed()

              const principalAmount = new Decimal(amount)
                .times(new Decimal('1e6'))
                .times(new Decimal(priceInfo.price))
                .toFixed()

              await groupFiService.buySMR({
                contract: priceInfo.contract,
                targetAmount,
                principalAmount,
                web3,
                nodeId
              })

              // onPurchaseFinish()
            } catch (error) {
              console.log('buy smr error=>', error)
            } finally {
            }
          }}
        >
          <span className={classNames('text-white text-base')}>Get SMR</span>
        </button>
        <div className={classNames('py-3 text-[#3671EE] text-right')}>
          <button>Browse as a guest</button>
        </div>
      </div>
      {loading && <LoadingModal type="dot-spin" />}
      {/* <div>================================</div>
      <div>仅用于测试，由于现在买token 还未实现</div>
      <button
        onClick={async () => {
          const res = await groupFiService.importSMRProxyAccount()
          console.log('===>importSMRProxyAccount res', res)
          setAddress(res)
        }}
        className={classNames('w-full bg-[#3671EE] rounded-xl py-3')}
      >
        点击这里手动导入Impersation Mode代理钱包
      </button>
      <div>proxy address: {address}</div>
      <div>有了proxy address之后，手动往里面打一笔钱。</div>
      <div>proxy address有了钱之后，点击注册按钮会开始注册 tp pairX</div>
      <button
        onClick={async () => {
          onPurchaseFinish()
        }}
        className={classNames('w-full bg-[#3671EE] rounded-xl py-3')}
      >
        注册 pairX
      </button> */}
    </div>
  )
}
