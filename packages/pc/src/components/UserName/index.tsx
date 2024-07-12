import { classNames } from 'utils'
import TanglePayLogo from 'public/icons/tanglepay-logo.svg'
// @ts-ignore
import SpinSVG from 'public/icons/spin.svg?react'
import ErrorCircle from 'public/icons/error-circle.svg'
import ErrorCancel from 'public/icons/error-cancel.svg'
import { DelegationMode, Mode, useMessageDomain } from 'groupfi_chatbox_shared'

import { useEffect, useRef, useState } from 'react'

function checkUserName(name: string) {
  if (name === '') {
    return 'Please enter a name.'
  }
  if (name.length < 8) {
    return 'Name too short.'
  }
  if (name.length > 20) {
    return 'Name too long.'
  }
  const regexp = /^[a-zA-Z0-9]+$/
  if (!regexp.test(name)) {
    return 'Improper character.'
  }
  return undefined
}

export function UserNameCreation(props: {
  onMintFinish: () => void
  mode: Mode
}) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const { onMintFinish, mode } = props

  const isDelegationMode = mode === DelegationMode

  const [modalShow, setModalShow] = useState<boolean>(false)
  const [name, setName] = useState<string>('')
  const [error, setError] = useState<string | undefined>(undefined)

  const [minting, setMinting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const inputFocus = () => {
    if (inputRef.current !== null) {
      inputRef.current.focus()
    }
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

  return (
    <>
      <div className={classNames('w-full h-full pt-[148px] relative')}>
        <div className={classNames('flex flex-row justify-center')}>
          <img src={TanglePayLogo} className={classNames('w-7 h-7 mr-3')} />
          <span
            className={classNames(
              'text-2xl leading-7 font-bold text-[#3671EE]'
            )}
          >
            GroupFi
          </span>
        </div>
        <div className={classNames('flex flex-row mt-20 justify-center')}>
          <span
            className={classNames(
              'font-bold text-base text-[#333] dark:text-[#ccc]'
            )}
          >
            Mint a name NFT for free!
          </span>
        </div>
        <div className="mt-3 flex flex-row justify-center">
          <div className="flex w-[263px] rounded-md shadow-sm bg-[#f2f2f7] dark:bg-black text-[#333] dark:text-[#ccc] rounded-[10px] text-base">
            <input
              type="text"
              autoFocus
              value={name}
              ref={inputRef}
              onChange={(event) => {
                const value = event.target.value
                setName(value)
              }}
              className="block flex-1 pl-2 border-0 bg-transparent py-1.5 pl-1 outline-0 placeholder:pl-4 placeholder:text-base placeholder:font-normal h-10"
              placeholder="8 - 20 letters & numbers"
            />
            <span className="flex select-none items-center pr-3">.gf</span>
          </div>
        </div>
        {error !== undefined && (
          <ErrorInfo content={error} cancel={() => setError(undefined)} />
        )}
        <div
          className={classNames(
            'absolute left-0 bottom-7 w-full flex flex-row justify-center px-5'
          )}
        >
          <button
            className={classNames('w-full bg-[#3671EE] rounded-xl py-3')}
            onClick={async () => {
              if (minting) {
                return
              }
              const error = checkUserName(name)
              if (error !== undefined) {
                setError(error)
                inputFocus()
                return
              }
              try {
                setMinting(true)
                setModalShow(true)
                const res =
                  mode === DelegationMode
                    ? await groupFiService.mintProxyNicknameNft(name)
                    : await groupFiService.mintNicknameNFT(name)

                if (!res.result) {
                  setModalShow(false)
                  setMinting(false)
                  if (res.errCode === 4) {
                    setError('This name is already taken.(case-insensitive)')
                  }
                } else if (mode != DelegationMode) {
                  setMinting(false)
                }
              } catch (error: any) {
                setError(error.toString())
                setModalShow(false)
                setMinting(false)
              }
            }}
          >
            <span className={classNames('text-white text-base')}>
              Free Mint
            </span>
          </button>
        </div>
      </div>
      {modalShow && (
        <div
          className={classNames(
            `bg-[#333] dark:bg-[#ffffff20] items-end`,
            'absolute left-0 top-0 rounded-2xl inset-0 transition-opacity flex justify-center z-[100] bg-opacity-50'
          )}
        >
          <div
            className={classNames(
              'w-full text-[#333] dark:text-[#ccc] bg-white dark:bg-[#212122] rounded-xl text-base'
            )}
          >
            <div
              className={classNames('pt-6 leading-5 text-center font-semibold')}
            >
              {minting ? (
                <>
                  <SpinSVG
                    className={classNames(
                      'inline-block animate-spin-slow mr-1 relative h-[18px] top-[-1px] text-black dark:text-white'
                    )}
                  />
                  Minting
                </>
              ) : (
                'Minted'
              )}
            </div>
            {isDelegationMode ? (
              <div className={classNames('px-5 py-4 text-center')}>
                Welcome to the new world, {name.toLocaleLowerCase()}
              </div>
            ) : (
              <div className={classNames('px-5 py-4')}>
                The minted name NFT will be sent to your shimmer account with a
                Storage Deposit Return Lock, please remember to accept the NFT
                in your wallet.
              </div>
            )}
            {!isDelegationMode && (
              <div className={classNames('px-5 w-full mb-7')}>
                <button
                  disabled={minting}
                  className={classNames(
                    'w-full font-medium rounded-2xl py-3',
                    minting
                      ? 'bg-[#F2F2F7] dark:bg-gray-700'
                      : 'bg-[#3671EE] text-white'
                  )}
                  onClick={() => {
                    if (minting) {
                      return
                    }
                    onMintFinish()
                  }}
                >
                  I Understand
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ErrorInfo(props: { content: string; cancel: () => void }) {
  const { content, cancel } = props
  return (
    <div
      className={classNames(
        'mt-3 flex flex-row justify-center rounded-xl px-5'
      )}
    >
      <div
        className={classNames(
          'flex w-full flex-row py-2.5 text-base bg-[#D53554]/5 rounded-xl text-[#D53554]'
        )}
      >
        <img src={ErrorCircle} className={classNames('mx-3')} />
        <div className={'flex-1'}>
          <div>
            <span className={classNames('font-bold mr-1')}>Error:</span>
            <span>{content}</span>
          </div>
          <div>8-20 letters & numbers.</div>
        </div>
        <img
          onClick={cancel}
          src={ErrorCancel}
          className={classNames('mr-3 cursor-pointer')}
        />
      </div>
    </div>
  )
}

// export default () => (
//   <GroupFiServiceWrapper<{ groupFiService: GroupFiService }>
//     component={UserNameCreation}
//     paramsMap={{}}
//   />
// )
