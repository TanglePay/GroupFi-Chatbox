import { ArrowDown } from 'components/Shared'
import { useState } from 'react'
import { classNames } from 'utils'

function SelectList(props: {
  value: string
  setValue: Function
  list: { label: string; value: string }[] | []
}) {
  return (
    <div
      className={classNames(
        'z-10 w-20 bg-white shadow-lg rounded-lg ring-1 ring-black ring-opacity-5 focus:outline-none absolute top-0'
      )}
    >
      <ul
        className={classNames('py-1 text-sm')}
        aria-labelledby="dropdownMenuButton"
        role="menu"
      >
        {props.list.map((e) => {
          return (
            <a
              className={classNames(
                'px-2 py-1.5 text-base font-bold hover:bg-gray-100 border-b border-b-[#EBEBEB] last:border-0 cursor-pointer flex justify-between items-center'
              )}
              role="menuitem"
              onClick={() => {
                props.setValue(e.value)
              }}
              key={e.value}
            >
              {e.label}
              {props.value === e.value && (
                <div className={classNames('-rotate-[180deg]')}>
                  <ArrowDown />
                </div>
              )}
            </a>
          )
        })}
      </ul>
    </div>
  )
}

export function CoinSelect(props: { setAmount: Function; amount: string }) {
  const [coin, setCoin] = useState<string>('eth')
  const [showSelect, setShowSelect] = useState<boolean>(false)
  const selectList = [
    {
      label: 'ETH',
      value: 'eth'
    },
    {
      label: 'BTC',
      value: 'btc'
    },
    {
      label: 'USDC',
      value: 'usdc'
    }
  ]
  return (
    <div className={classNames('px-5 pt-6 pb-4')}>
      <div className={classNames('flex items-center justify-between')}>
        <div className={classNames('relative')}>
          <div
            className={classNames(
              'flex justify-between bg-white dark:bg-[#212121] rounded-lg px-2 py-1.5 w-20 h-8 items-center cursor-pointer'
            )}
            onClick={() => setShowSelect(true)}
          >
            <div className={classNames('font-bold text-base')}>
              {selectList.find((e) => e.value == coin)?.label}
            </div>
            <ArrowDown />
          </div>
          {showSelect && (
            <SelectList
              list={selectList}
              value={coin}
              setValue={(e: string) => {
                setCoin(e)
                setShowSelect(false)
              }}
            />
          )}
        </div>
        <div>
          <input
            type="number"
            value={props.amount}
            autoFocus
            autoComplete={'off'}
            className={classNames(
              'text-right text-2xl font-bold w-[90px] focus:outline-0 placeholder:text-gray-400 placeholder:text-right bg-transparent number-input'
            )}
            placeholder="0"
            onChange={(e) => {
              props.setAmount(e.target.value)
            }}
          />
        </div>
      </div>
      <div
        className={classNames('mt-1.5 text-xxs text-[#2C2C2E] dark:text-white')}
      >
        Current Balance: 0
      </div>
    </div>
  )
}

export function CoinView() {
  const [amount, setAmount] = useState<string>('10')
  const [coin, setCoin] = useState<string>('eth')
  const selectList = [
    {
      label: 'ETH',
      value: 'eth'
    },
    {
      label: 'BTC',
      value: 'btc'
    },
    {
      label: 'USDC',
      value: 'usdc'
    }
  ]
  console.log(amount)
  return (
    <div className={classNames('px-5 pt-6 pb-4')}>
      <div className={classNames('flex items-center justify-between')}>
        <div className={classNames('py-1.5 w-20 h-8 font-bold text-base')}>
          SOLANA1
        </div>
        <div
          className={classNames(
            'text-right text-2xl font-bold w-[90px] text-gray-400 dark:text-white'
          )}
        >
          {amount}
        </div>
      </div>
    </div>
  )
}
