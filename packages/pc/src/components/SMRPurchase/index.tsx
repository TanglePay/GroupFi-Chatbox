import { ModeInfo, useMessageDomain } from 'groupfi_trollbox_shared'
import { useState } from 'react'
import { classNames } from 'utils'

import TanglePayLogoSVG from 'public/icons/tanglepay-logo.svg'
import RightSVG from 'public/icons/right.svg'

export default function SMRPurchase(props: {
  address: string
  enterGuestMode: () => void
  modeInfo?: ModeInfo
  onPurchaseFinish: () => void
}) {
  const { onPurchaseFinish } = props
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()
  const [amount, setAmount] = useState<number | undefined>(undefined)

  const [address, setAddress] = useState<string | undefined>(undefined)

  return (
    <div className={classNames('px-5')}>
      <div className={classNames('flex flex-row mt-6')}>
        <img src={TanglePayLogoSVG} className={classNames('w-7 h-7')} />
        <h3
          className={classNames(
            'leading-7 text-2xl font-bold text-[#3671EE] ml-3'
          )}
        >
          GroupFi
        </h3>
      </div>
      <div className={classNames('font-bold text-[#333] mt-8')}>
        Free Shimmer Proxy
        <img
          src={RightSVG}
          className={classNames('w-4 h-4 ml-1 inline-block')}
        />
      </div>
      <div className={classNames('mt-1')}>
        The Shimmer proxy is used for message sending
      </div>
      <div className={classNames('text-[#333] font-bold mt-7')}>Buy SMR</div>
      <div>
        <input
          type="text"
          autoFocus
          value={amount}
          onChange={(event) => {
            let value = Number(event.target.value)
            if (isNaN(value)) {
              setAmount(0)
            } else {
              setAmount(value)
            }
          }}
          placeholder="Input amount"
        />
        <span className={classNames('text-[#333]')}>SMR</span> (Layer 1)
      </div>
      <button
        className={classNames('w-full bg-[#3671EE] rounded-xl py-3')}
        onClick={async () => {}}
      >
        <span className={classNames('text-white text-base')}>
          Get Layer 1 SMR
        </span>
      </button>
      <div>Browse as a guest</div>
      <div>================================</div>
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
      </button>
    </div>
  )
}
