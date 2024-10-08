import { useParams } from 'react-router-dom'
import {
  ContainerWrapper,
  HeaderWrapper,
  ReturnIcon,
  GroupTitle,
  ContentWrapper
} from '../Shared'
import { useEffect, useState } from 'react'
import { classNames } from 'utils'
import { CoinSelect, CoinView } from './CoinSelect'

export function Aggregator(props: { token: string }) {
  console.log('🚀 ~ Aggregator ~ token:', props.token)
  const [amount, setAmount] = useState<string>('')
  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle showGroupPrivateIcon={false} title={`Buy XXXX`} />
      </HeaderWrapper>
      <ContentWrapper
        customizedClass={classNames('flex flex-col justify-center px-5')}
      >
        <div className={classNames('rounded-xl bg-[#f2f2f7] dark:bg-gray-700')}>
          <CoinSelect amount={amount} setAmount={setAmount} />
          <div className={classNames('relative')}>
            <svg
              className={classNames(
                'absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'
              )}
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 6.23063e-06C7.16345 5.45811e-06 9.80067e-06 7.16345 9.02816e-06 16C8.25564e-06 24.8366 7.16345 32 16 32C24.8366 32 32 24.8366 32 16C32 7.16345 24.8366 7.00315e-06 16 6.23063e-06Z"
                fill="white"
              />
              <path
                d="M9.59966 16L15.9997 22.4L22.3997 16"
                stroke="black"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M16 9.59997L16 22.4"
                stroke="black"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div className={classNames('w-full h-[1px] bg-white')}></div>
          <CoinView />
        </div>
        <div
          className={classNames(
            'flex items-center justify-between px-4 py-3 text-sm'
          )}
        >
          <div>Price</div>
          <div className={classNames('flex items-center justify-between')}>
            <div>1 SOLONA1 = xxx ETH</div>
            <div className={classNames('cursor-pointer ml-1.5')}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clip-path="url(#clip0_8841_25758)">
                  <path
                    d="M15.0001 9.99998L12.5001 9.99998L15.8334 13.3333L19.1667 9.99998L16.6667 9.99998C16.6667 6.31665 13.6834 3.33331 10.0001 3.33331C8.69175 3.33331 7.47508 3.71665 6.45008 4.36665L7.66675 5.58331C8.35841 5.20831 9.15841 4.99998 10.0001 4.99998C12.7584 4.99998 15.0001 7.24165 15.0001 9.99998ZM13.5501 15.6333L12.3334 14.4166C11.6334 14.7833 10.8417 15 10.0001 15C7.24175 15 5.00008 12.7583 5.00008 9.99998L7.50008 9.99998L4.16675 6.66665L0.833414 9.99998L3.33341 9.99998C3.33341 13.6833 6.31675 16.6666 10.0001 16.6666C11.3084 16.6666 12.5251 16.2833 13.5501 15.6333Z"
                    fill="#959595"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_8841_25758">
                    <rect
                      width="20"
                      height="20"
                      fill="white"
                      transform="translate(20) rotate(90)"
                    />
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        <button
          disabled={!amount}
          onClick={() => {}}
          type="button"
          className={classNames(
            'w-full mt-4 text-base rounded-[10px] p-2.5 active:opacity-80',
            !amount
              ? 'bg-[#F2F2F7] dark:bg-gray-700'
              : 'bg-[#3671EE] text-white'
          )}
        >
          {!!amount ? 'Buy' : 'Enter an Amount'}
        </button>
      </ContentWrapper>
    </ContainerWrapper>
  )
}

export default () => {
  const params = useParams()
  const token = params.token || ''
  return <Aggregator token={token} />
}
