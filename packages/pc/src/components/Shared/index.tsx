import { PropsWithChildren, useRef, useState, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import { GroupFiService, useMessageDomain } from 'groupfi_trollbox_shared'
import { createPortal } from 'react-dom'
import { classNames, addressToPngSrc, copyText } from 'utils'
import { useGroupMembers } from '../../hooks'
import CopySVG from 'public/icons/copy.svg'
import HomeSVG from 'public/icons/home.svg'
import CollapseSVG from 'public/icons/collapse.svg'

import { Link } from 'react-router-dom'

import PrivateGroupSVG from 'public/icons/private.svg'
import { useAppSelector, useAppDispatch } from '../../redux/hooks'
import { changeActiveTab } from '../../redux/appConfigSlice'

export function GroupFiServiceWrapper<
  T extends {
    groupFiService: GroupFiService
  }
>(props: {
  component: (props: T) => JSX.Element
  paramsMap: { [key: string]: string }
}) {
  const { component: Component, paramsMap } = props
  const params = useParams()
  const { messageDomain } = useMessageDomain()

  const groupFiService = messageDomain.getGroupFiService()

  const paramPairs: { [key: string]: string } = {}

  for (const key in paramsMap) {
    const value = params[key]
    if (value === undefined) {
      return null
    }
    const keyToShow = paramsMap[key]
    paramPairs[keyToShow] = value
  }

  if (groupFiService === null) {
    return null
  }

  const componentProps = {
    groupFiService: groupFiService,
    ...paramPairs
  } as T

  return <Component {...componentProps} />
}

export function AppWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div
      className={classNames('w-full h-full border border-black/10 rounded-2xl')}
    >
      <div
        className={classNames('flex items-center justify-center rounded-tr-2xl absolute right-0 h-[44px] w-[48px]')}
      >
        {CollapseTopIcon()}
      </div>
      {children}
    </div>
  )
}

export function ContainerWrapper({children}: PropsWithChildren<{}>) {
  return <div className={classNames('flex flex-col h-full')}>{children}</div>
}

export function HeaderWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div className={classNames(
      'flex-none border-b border-black/10 font-medium pr-[48px]'
    )}>
      <div className={classNames('flex flex-row text-center')}>
        {children}
        <div
          className={classNames(
            'flex-none border-r border-black/10 mt-1.5 mb-1.5'
          )}
        ></div>
      </div>
    </div>
  )
}

export function ContentWrapper({children}: PropsWithChildren<{}>) {
  return (
    <div className={classNames('flex-1 overflow-x-hidden overflow-y-scroll')}>
      {children}
    </div>
  )
}

export function CollapseTopIcon() {
  const collapseTop = () => {
    window.parent.postMessage('collapse-trollbox', '*')
  }
  return (
    <div className={classNames(
      'flex-none my-2.5 text-left cursor-pointer flex items-center'
    )}>
      <a href={'javascript:void(0)'} onClick={() => collapseTop()}>
        <img src={CollapseSVG}/>
      </a>
    </div>
  )
}

export function HomeIcon() {
  return (
    <div
      className={classNames(
        'flex-none w-44px ml-4 mr-2.5 my-2.5 text-left cursor-pointer flex items-center'
      )}
    >
      <Link to={'/'}>
        <img src={HomeSVG} />
      </Link>
    </div>
  )
}

export function ReturnIcon() {
  return (
    <Link to={-1 as any}>
      <div
        className={classNames(
          'flex-none w-44px ml-4 mr-2.5 my-2.5 text-left cursor-pointer'
        )}
      >
        <i
          className={classNames(
            'w-2.5 h-2.5 ml-2 rotate-45 inline-block border-l-2 border-b-2 border-black'
          )}
        ></i>
      </div>
    </Link>
  )
}

export function ArrowRight() {
  return (
    <i
      className={classNames(
        'w-2.5 h-2.5 ml-2 -rotate-[135deg] inline-block border-l-2 border-b-2 border-black'
      )}
    ></i>
  )
}
export function GroupIcon(props: {
  groupId: string
  unReadNum: number
  groupFiService: GroupFiService
}) {
  const { groupId, unReadNum, groupFiService } = props

  const { memberAddresses } = useGroupMembers(groupId, 9)

  const memberLength = memberAddresses?.length ?? 0

  let element: React.ReactElement | null = null

  if (memberLength === 1) {
    element = (
      <div>
        <img
          className={classNames('rounded')}
          src={addressToPngSrc(groupFiService.sha256Hash, memberAddresses![0])}
        />
      </div>
    )
  }

  const renderARowWhenWidth20 = (mexTwoAddrs: string[]) => {
    return (
      <div className={classNames('flex w-full flex-row justify-evenly')}>
        {mexTwoAddrs.map((addr) => (
          <div key={addr} className={classNames('w-[20px]')}>
            <img src={addressToPngSrc(groupFiService.sha256Hash, addr)} />
          </div>
        ))}
      </div>
    )
  }

  const renderARowWhenWidth12 = (maxThreeAddrs: string[], index: number) => {
    return (
      <div
        key={index}
        className={classNames(
          'flex w-full flex-row ',
          maxThreeAddrs.length % 2 === 1 ? 'justify-evenly' : 'justify-center'
        )}
      >
        {maxThreeAddrs.map((addr) => (
          <div
            key={addr}
            className={classNames(
              'w-[12px]',
              maxThreeAddrs.length === 2 ? 'mr-0.5' : ''
            )}
          >
            <img src={addressToPngSrc(groupFiService.sha256Hash, addr)} />
          </div>
        ))}
      </div>
    )
  }

  if (memberLength >= 2 && memberLength <= 4) {
    element = (
      <div className={classNames('flex flex-col justify-evenly w-full h-full')}>
        {arrSplit(memberAddresses!, 2).map((arr, idx) => (
          <div key={idx}>{renderARowWhenWidth20(arr)}</div>
        ))}
      </div>
    )
  }

  if (memberLength >= 5 && memberLength <= 6) {
    element = (
      <div className={classNames('flex flex-col justify-center w-full h-full')}>
        {arrSplit(memberAddresses!, 3).map((arr, idx) => (
          <div key={idx} className={classNames(idx === 0 ? 'mb-0.5' : '')}>
            {renderARowWhenWidth12(arr, idx)}
          </div>
        ))}
      </div>
    )
  }

  if (memberLength >= 7 && memberLength <= 9) {
    element = (
      <div className={classNames('flex flex-col justify-evenly w-full h-full')}>
        {arrSplit(memberAddresses!, 3).map((arr, index) =>
          renderARowWhenWidth12(arr, index)
        )}
      </div>
    )
  }

  return (
    <div
      className={classNames(
        'relative bg-gray-200/70 rounded mr-4 my-3 flex-none',
        `w-[46px]`,
        `h-[48px]`
      )}
    >
      {element}
      {unReadNum > 0 && (
        <div
          className={classNames(
            'absolute -top-1 -right-1 w-2 h-2 rounded bg-[#D53554]'
          )}
        ></div>
      )}
    </div>
  )
}

function arrSplit(arr: string[], step: number): string[][] {
  const res: string[][] = []
  let temp: string[] = []
  for (let i = arr.length - 1; i >= 0; i--) {
    temp.unshift(arr[i])
    if (temp.length === step) {
      res.unshift(temp)
      temp = []
    }
  }
  if (temp.length > 0) {
    res.unshift(temp)
  }
  return res
}

export function GroupListTab(props: { groupFiService: GroupFiService }) {
  const { groupFiService } = props
  const activeTab = useAppSelector((state) => state.appConifg.activeTab)

  const currentAddress = groupFiService.getCurrentAddress()

  const appDispatch = useAppDispatch()

  const tabList = [
    {
      label: 'For Me',
      key: 'forMe'
    },
    {
      label: 'My Groups',
      key: 'ofMe'
    },
    {
      label: 'User',
      key: 'profile',
      flex: 'flex-0',
      render: () => {
        return (
          <div className={classNames('mx-4')}>
            <img
              className={classNames('w-6 h-6 rounded-md')}
              src={addressToPngSrc(groupFiService.sha256Hash, currentAddress)}
            />
          </div>
        )
      }
    }
  ]

  return tabList.map(({ label, key, flex, render }, index) => (
    <Fragment key={key}>
      {index > 0 && (
        <div
          className={classNames(
            'flex-none border-l border-black/10 mt-1.5 mb-1.5'
          )}
        ></div>
      )}
      <div
        onClick={() => {
          appDispatch(changeActiveTab(key))
        }}
        className={classNames(
          flex ? flex : 'flex-1',
          'pt-2.5 pb-2.5 cursor-pointer hover:bg-gray-50',
          index === 0 ? 'rounded-tl-2xl' : undefined,
          // index === tabList.length - 1 ? 'rounded-tr-2xl' : undefined,
          activeTab === key ? 'text-primary' : 'text-black/50'
        )}
      >
        {render ? render() : label}
      </div>
    </Fragment>
  ))
}

export function GroupTitle({
                             showGroupPrivateIcon,
                             title
                           }: {
  showGroupPrivateIcon?: boolean
  title: string
}) {
  return (
    <div
      className={classNames(
        'flex-none grow my-2.5 flex flex-row justify-center items-center'
      )}
    >
      {showGroupPrivateIcon && (
        <i className={classNames('w-4 h-4 mr-2.5')}>
          <img src={PrivateGroupSVG} />
        </i>
      )}
      <span>{title}</span>
    </div>
  )
}

export function MoreIcon({ to }: { to: string }) {
  return (
    <div
      className={classNames(
        'flex-none ml-2.5 mr-1.5 my-1.5 w-8 h-8 flex flex-row justify-center items-center cursor-pointer'
      )}
    >
      <Link to={to}>
        {Array.from({ length: 3 }, (_, index) => index + 1).map((item, idx) => (
          <i
            key={idx}
            className={classNames(
              'w-1 h-1 bg-black inline-block rounded-sm',
              item !== 3 ? 'mr-1' : undefined
            )}
          ></i>
        ))}
      </Link>
    </div>
  )
}

export function Loading({
  marginTop = 'mt-20',
  type = 'dot-windmill'
}: {
  marginTop?: string
  type?: string
  padding?: string
}) {
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-row justify-center justify-items-center',
        marginTop
      )}
    >
      <div className={type}></div>
    </div>
  )
}

export function LoadingModal(props: { type?: string }) {
  const { type } = props
  return (
    <Modal show={true} hide={() => {}} opacity={10}>
      <Loading type={type ?? 'dot-pulse'} marginTop="mt-[400px]" />
    </Modal>
  )
}

export function Spinner() {
  return (
    <div
      className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500"
      role="status"
      aria-label="loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export function Modal({
  show,
  hide,
  children,
  alignItems
}: PropsWithChildren<{
  show: boolean
  hide: () => void
  alignItems?: 'flex-end' | 'flex-start'
  opacity?: number
  bgColor?: string
}>) {
  if (!show) {
    return false
  }
  return createPortal(
    <div
      className={classNames(
        `bg-[#333]`,
        alignItems ? 'items-end' : 'items-center',
        'absolute left-0 top-0 rounded-2xl inset-0 transition-opacity flex justify-center z-[100] bg-opacity-50'
      )}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      {children}
    </div>,
    document.getElementById('root')!
  )
}

export function AppLoading() {
  return renderCeckRenderWithDefaultWrapper(<Spinner />)
}

export function renderCeckRenderWithDefaultWrapper(element: JSX.Element) {
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-row items-center justify-center'
      )}
    >
      {element}
    </div>
  )
}

export function AsyncActionWrapper({
  children,
  onCallback,
  onClick,
  async = true
}: PropsWithChildren<{
  onCallback?: () => void
  onClick: () => void
  async?: boolean
}>) {
  const [loading, setLoading] = useState(false)
  return (
    <div
      onClick={async () => {
        if (!async) {
          onClick()
          return
        }
        try {
          setLoading(true)
          await onClick()
          if (onCallback) {
            onCallback()
          }
        } catch (error) {
          console.log('Async action error', error)
          throw error
        } finally {
          setLoading(false)
        }
      }}
    >
      {children}
      {loading && <LoadingModal />}
    </div>
  )
}

export function CopyTooltip({
  children,
  message
}: PropsWithChildren<{ message: string }>) {
  return (
    <div className="relative">
      <div
        className={classNames(
          'group cursor-pointer relative inline-block text-center'
        )}
      >
        {children}
        <div
          className={classNames(
            `w-[calc(100%+30px)]`,
            `-left-[15px]`,
            'opacity-0 bg-black text-white  text-center text-xs rounded-lg py-1 absolute z-10 group-hover:opacity-100 bottom-full pointer-events-none'
          )}
        >
          {message}
          <svg
            className="absolute text-black h-2 w-full left-0 top-full"
            x="0px"
            y="0px"
            viewBox="0 0 255 255"
          >
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function GeneralTooltip({
  children,
  message,
  height,
  width,
  toolTipContentWidth
}: PropsWithChildren<{
  message: string
  toolTipContentWidth: number
  width: number
  height: number
}>) {
  return (
    <div className="relative inline-block">
      <div
        className={classNames(
          'group cursor-pointer relative inline-block text-left'
        )}
      >
        {children}
        <div
          style={{
            bottom: height + 8,
            width: width + toolTipContentWidth,
            left: -toolTipContentWidth / 2
          }}
          className={classNames(
            'opacity-0 bg-white py-2 px-4 text-gray-500 border border-gray-200 rounded-lg text-center text-sm py-1 absolute z-10 group-hover:opacity-100  pointer-events-none'
          )}
        >
          {message}
          <svg
            className={classNames('absolute h-2.5 w-full left-0 top-full')}
            x="0px"
            y="0px"
            viewBox="0 0 255 255"
          >
            <polygon fill="lightgrey" points="0,0 127.5,127.5 255,0" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function Copy(props: { text: string }) {
  const { text } = props
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await copyText(text)
      setCopied(true)
    } catch (error) {
      console.log('Copy error', error)
    }
  }

  return (
    <div className={classNames('inline-block')}>
      <CopyTooltip message={copied ? 'Copied' : 'Copy'}>
        <img
          onClick={onCopy}
          onMouseLeave={() => {
            setCopied(false)
          }}
          src={CopySVG}
          className={classNames('inline-block cursor-pointer py-2 px-2')}
        />
      </CopyTooltip>
    </div>
  )
}

export function CollapseIcon(props: { collapsed: boolean }) {
  return (
    <i
      className={classNames(
        'w-2 h-2 ml-2 rotate inline-block  border-l-2 border-[#6C737C] border-b-2 border-black cursor-pointer relative',
        props.collapsed ? 'rotate-[135deg]' : '-rotate-45 bottom-[3px]'
      )}
    ></i>
  )
}

export function usePopoverMouseEvent(
  currentStatus: boolean,
  show: () => void,
  hide: () => void
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onMouseEnter = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!currentStatus) {
      show()
    }
  }
  const onMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      hide()
    }, 250)
  }

  return [onMouseEnter, onMouseLeave]
}
