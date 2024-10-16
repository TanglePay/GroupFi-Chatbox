import { classNames } from 'utils'
import TanglePayLogo from 'public/icons/tanglepay-logo.svg'
// @ts-ignore
import SpinSVG from 'public/icons/spin.svg?react'
import ErrorCircle from 'public/icons/error-circle.svg'
import ErrorCancel from 'public/icons/error-cancel.svg'
import {
  DelegationMode,
  useMessageDomain,
  Profile
} from 'groupfi-sdk-chat'

import {
  ContainerWrapper,
  HeaderWrapper,
  GroupTitle,
  ReturnIcon,
  OnlyReturnIcon,
  ButtonLoading,
  LoadingModal
} from '../Shared'

import { addressToPngSrcV2 } from 'utils'

import { useCallback, useEffect, useRef, useState } from 'react'

import { NavigateFunction } from 'react-router-dom'

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
  currentProfile?: Profile
  hasReturnIcon: boolean
  navigateFunc?: NavigateFunction
}) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const mode = groupFiService.getCurrentMode()

  const { onMintFinish, currentProfile, hasReturnIcon, navigateFunc } = props

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

  const profileList = messageDomain.getProfileList()

  const isHasProfileList = profileList && profileList.length > 0

  const [isRenderMintNamePage, setIsRenderMintNamePage] = useState(false)

  useEffect(() => {
    if (minting && isRenderMintNamePage) {
      if (navigateFunc) {
        navigateFunc(-1)
      }
    }
  }, [currentProfile])

  const onToggle = useCallback(() => {
    setIsRenderMintNamePage((s) => !s)
  }, [])

  if (!isRenderMintNamePage && isHasProfileList) {
    return (
      <UserNameSelection
        profileList={profileList}
        onToggle={onToggle}
        currentProfile={currentProfile}
        hasReturnIcon={hasReturnIcon}
        navigateFunc={navigateFunc}
      />
    )
  }

  return (
    <>
      <div
        className={classNames(
          'w-full h-full flex flex-col justify-between overflow-auto'
        )}
      >
        {isHasProfileList && <OnlyReturnIcon onClick={onToggle} />}
        <div className={classNames('flex-auto flex flex-col justify-center')}>
          <div>
            <div className={classNames('flex flex-row justify-center')}>
              <img src={TanglePayLogo} className={classNames('w-7 h-7 mr-3')} />
              <span
                className={classNames(
                  'text-2xl leading-7 font-bold text-primary'
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
          </div>
        </div>
        <div
          className={classNames(
            'my-7 w-full flex flex-row justify-center px-5'
          )}
        >
          <button
            className={classNames('w-full bg-accent-500 rounded-xl py-3')}
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
                    ? await groupFiService.isNameDuplicate(name)
                    : await groupFiService.mintNicknameNFT(name)

                if (!res.result) {
                  setModalShow(false)
                  setMinting(false)
                  if (res.errCode === 4) {
                    setError('This name is already taken.(case-insensitive)')
                  }
                  return
                }
                if (mode !== DelegationMode) {
                  setMinting(false)
                } else {
                  const profile = { chainId: 148, name }
                  messageDomain.setProfile(profile, true)
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

function UserNameSelection(props: {
  profileList: Profile[]
  onToggle: () => void
  currentProfile?: Profile
  hasReturnIcon: boolean
  navigateFunc?: NavigateFunction
}) {
  const { messageDomain } = useMessageDomain()

  const groupFiService = messageDomain.getGroupFiService()
  const currentAddress = groupFiService.getCurrentAddress()

  const { profileList, onToggle, currentProfile, hasReturnIcon, navigateFunc } =
    props

  const [selectedChainId, setSelectedChainId] = useState<number | undefined>(
    currentProfile?.chainId ?? undefined
  )

  const [isConfirming, setIsConfirming] = useState(false)

  const isHasGroupFiProfile = profileList?.find(
    (profile) => profile.chainId === 148
  )

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedChainId = event.target.value
    setSelectedChainId(Number(selectedChainId))
  }

  useEffect(() => {
    if (currentProfile !== undefined && isConfirming) {
      if (navigateFunc) {
        navigateFunc(-1)
      }
    }
  }, [currentProfile])

  const isButtonDisabled =
    !selectedChainId ||
    isConfirming ||
    currentProfile?.chainId === selectedChainId

  return (
    <ContainerWrapper classes="grow">
      <HeaderWrapper>
        {hasReturnIcon && <ReturnIcon />}
        <GroupTitle
          isAnnouncement={false}
          showAnnouncementIcon={false}
          showGroupPrivateIcon={false}
          title={'Select a Profile to Use'}
        />
      </HeaderWrapper>
      <div className={classNames('grow px-5 pt-5')}>
        {profileList.map((profile) => (
          <div
            key={profile.chainId}
            className={classNames(
              'flex flex-row p-3 items-center rounded-xl mb-4 border border-2',
              selectedChainId === profile.chainId
                ? 'border-accent-600 dark:border-accent-500'
                : 'border-[#F2F2F7]'
            )}
          >
            <img
              className={classNames('w-12 h-12 mr-3 object-cover rounded-lg')}
              src={
                !!profile.avatar
                  ? profile.avatar
                  : addressToPngSrcV2(groupFiService.sha256Hash(currentAddress))
              }
            />
            <div className={classNames('font-medium dark:text-white')}>{profile.name}</div>
            <input
              onChange={handleChange}
              value={profile.chainId}
              checked={selectedChainId === profile.chainId}
              type="radio"
              className={classNames('w-4 h-4 ml-auto cursor-pointer')}
            ></input>
          </div>
        ))}
      </div>
      <div className={classNames('flex-none px-5 pb-4')}>
        <button
          disabled={isButtonDisabled}
          className={classNames(
            'w-full bg-accent-500 rounded-xl py-3 flex flex-row justify-center disabled:opacity-50',
            isButtonDisabled ? 'disabled' : ''
          )}
          onClick={() => {
            if (selectedChainId === undefined) {
              return
            }
            const profile = profileList.find(
              (profile) => profile.chainId === selectedChainId
            )
            if (profile === undefined) {
              return
            }
            setIsConfirming(true)
            messageDomain.setProfile(profile, false)
          }}
        >
          {isConfirming && <ButtonLoading classes={classNames('mr-1')} />}
          <span className={classNames('text-white text-base')}>
            {isConfirming ? 'Confirming' : 'Confirm'}
          </span>
        </button>
        {!isHasGroupFiProfile && (
          <div
            className={classNames(
              'mt-3 text-center text-accent-600 cursor-pointer'
            )}
            onClick={onToggle}
          >
            Mint a name NFT
          </div>
        )}
      </div>
    </ContainerWrapper>
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
