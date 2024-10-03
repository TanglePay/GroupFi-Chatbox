import {
  PropsWithChildren,
  useRef,
  useState,
  Fragment,
  useEffect,
  useCallback
} from 'react'
import { GroupFiService } from 'groupfi_chatbox_shared'
import { createPortal } from 'react-dom'
import { classNames, addressToPngSrc, copyText, addressToPngSrcV2 } from 'utils'
import { useGroupMembers, useOneBatchUserProfile } from '../../hooks'
import EmptyIcon from 'public/icons/empty.webp'
// @ts-ignore
import CopySVG from 'public/icons/copy.svg?react'
// @ts-ignore
import HomeSVG from 'public/icons/home.svg?react'
// @ts-ignore
import CollapseSVG from 'public/icons/collapse.svg?react'

import { Link } from 'react-router-dom'

// @ts-ignore
import PrivateGroupSVG from 'public/icons/private.svg?react'
// @ts-ignore
import AnnouncementGroupSVG from 'public/icons/announcement.svg?react'
import { useAppSelector, useAppDispatch } from '../../redux/hooks'
import { changeActiveTab } from '../../redux/appConfigSlice'
import useUserBrowseMode from 'hooks/useUserBrowseMode'

import { MessageGroupMeta } from 'groupfi-sdk-core'
import useGroupMeta from 'hooks/useGroupMeta'
import useProfile from 'hooks/useProfile'

function getFieldValueFromGroupConfig(
  groupConfig: MessageGroupMeta,
  fieldName: keyof MessageGroupMeta
): string | undefined {
  // Check if customFields contains the field as a key
  if (groupConfig.customFields) {
    const customField = groupConfig.customFields.find(
      (field) => field.key === fieldName
    )
    if (customField && customField.value) {
      return customField.value
    }
  }

  // Fallback to the original field value in the groupConfig
  return groupConfig[fieldName] as string | undefined
}

export function wrapGroupMeta(
  messageGroupMeta: MessageGroupMeta
): MessageGroupMeta {
  // Create a proxy that intercepts field accesses
  return new Proxy(messageGroupMeta, {
    get(target: MessageGroupMeta, property: keyof MessageGroupMeta) {
      // Use the custom getter function to retrieve the field value
      return getFieldValueFromGroupConfig(target, property)
    }
  })
}

export function AppWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div
      className={classNames('w-full h-full border border-black/10 rounded-2xl')}
    >
      <div
        className={classNames(
          'flex items-center justify-center rounded-tr-2xl absolute right-0 z-10 h-[44px] w-[48px]'
        )}
      >
        {CollapseTopIcon()}
      </div>
      {children}
    </div>
  )
}

export function ContainerWrapper({
  children,
  classes
}: PropsWithChildren<{
  classes?: string
}>) {
  return (
    <div className={classNames('flex flex-col h-full', classes ?? '')}>
      {children}
    </div>
  )
}

export function HeaderWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div
      className={classNames(
        'flex-none border-b border-black/10 dark:border-gray-600 dark:bg-[#3C3D3F] font-medium'
      )}
    >
      <div className={classNames('flex flex-row text-center')}>
        {children}
        <div
          className={classNames(
            'flex-none border-r border-black/10 dark:border-gray-600 mt-1.5 mb-1.5'
          )}
        ></div>
        <div className={classNames('flex-none basis-12')}></div>
      </div>
    </div>
  )
}

export function ContentWrapper({
  children,
  customizedClass
}: PropsWithChildren<{
  customizedClass?: string
}>) {
  return (
    <div
      className={classNames(
        'flex-1 overflow-x-hidden overflow-y-scroll',
        customizedClass ?? ''
      )}
    >
      {children}
    </div>
  )
}

export function CollapseTopIcon() {
  const collapseTop = () => {
    window.parent.postMessage('collapse-trollbox', '*')
  }
  return (
    <div
      className={classNames(
        'flex-none my-2.5 text-left cursor-pointer flex items-center'
      )}
    >
      <a href={'javascript:void(0)'} onClick={() => collapseTop()}>
        <CollapseSVG />
      </a>
    </div>
  )
}

export function HomeIcon() {
  return (
    <div
      className={classNames(
        'flex-none text-accent-600 dark:text-accent-500 w-44px ml-4 mr-2.5 my-2.5 text-left cursor-pointer flex items-center'
      )}
    >
      <Link to={'/'}>
        {/* <img src={HomeSVG} /> */}
        <HomeSVG />
      </Link>
    </div>
  )
}

// fix bug https://github.com/remix-run/react-router/discussions/10992
// dhq
export function ReturnIcon(props: { backUrl?: string }) {
  const backUrl = props?.backUrl || ''
  return (
    <Link
      to={(backUrl || -1) as any}
      replace={!!backUrl}
      className={classNames(
        'flex-none w-6 ml-4 mr-2.5 my-2.5 text-left cursor-pointer'
      )}
    >
      <i
        className={classNames(
          'w-2.5 h-2.5 ml-2 rotate-45 inline-block border-l-2 border-b-2 border-black dark:border-white'
        )}
      ></i>
    </Link>
  )
}

export function OnlyReturnIcon(props: { onClick?: () => void }) {
  return (
    <div
      onClick={props.onClick}
      className={classNames(
        'flex-none w-6 ml-4 mr-2.5 my-2.5 text-left cursor-pointer'
      )}
    >
      <i
        className={classNames(
          'w-2.5 h-2.5 ml-2 rotate-45 inline-block border-l-2 border-b-2 border-black dark:border-white'
        )}
      ></i>
    </div>
  )
}

export function ArrowRight() {
  return (
    <i
      className={classNames(
        'w-2.5 h-2.5 ml-2 -rotate-[135deg] inline-block border-l-2 border-b-2 border-black dark:border-white'
      )}
    ></i>
  )
}

export function GroupIcon(props: {
  icon?: string
  groupId: string
  unReadNum: number
  groupFiService: GroupFiService
}) {
  const { groupFiService, groupId, icon } = props
  const groupTokenUri = groupFiService.getGroupTokenUri(groupId)

  const groupMeta = useGroupMeta(groupId)

  const groupConfigedIcon = icon ?? groupMeta.icon

  if (!groupConfigedIcon && !groupTokenUri) {
    return <GroupMemberIcon {...props} />
  }

  // 优先渲染的，放在后面，使用的是 pop()
  const urls = [groupTokenUri, groupConfigedIcon].filter(Boolean) as string[]
  return <GroupTokenIcon {...props} urls={urls} />
}

function GroupTokenIcon(props: {
  groupId: string
  groupFiService: GroupFiService
  unReadNum: number
  urls: string[]
}) {
  const { unReadNum, urls } = props
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(urls.pop())

  if (!currentUrl) {
    return <GroupMemberIcon {...props} />
  }

  return (
    <div
      className={classNames(
        'relative bg-gray-200/70 rounded mr-4 my-3 flex-none',
        `w-[46px]`,
        `h-[46px]`
      )}
    >
      <div className={classNames('w-full h-full')}>
        <img
          className={classNames('rounded w-full h-full object-cover')}
          src={currentUrl}
          onError={() => {
            setCurrentUrl(urls.pop())
          }}
        />
      </div>
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

export function GroupMemberIcon(props: {
  groupId: string
  unReadNum: number
  groupFiService: GroupFiService
}) {
  const { groupId, unReadNum, groupFiService } = props

  const { memberAddresses } = useGroupMembers(groupId, 9)

  const { userProfileMap } = useOneBatchUserProfile(memberAddresses ?? [])

  const getMemberAvatar = useCallback(
    (address: string) => {
      const profile = userProfileMap?.get(address)
      if (profile?.avatar) {
        return profile.avatar
      }
      return addressToPngSrcV2(groupFiService.sha256Hash(address))
    },
    [userProfileMap]
  )

  const memberLength = memberAddresses?.length ?? 0

  let element: React.ReactElement = (
    <div>
      <img className={classNames('rounded')} src={EmptyIcon} />
    </div>
  )

  if (memberLength === 1) {
    element = (
      <div className={classNames('w-full h-full')}>
        <img
          className={classNames('rounded w-full h-full object-cover')}
          src={getMemberAvatar(memberAddresses![0])}
        />
      </div>
    )
  }

  const renderARowWhenWidth20 = (mexTwoAddrs: string[]) => {
    return (
      <div className={classNames('flex w-full flex-row justify-evenly')}>
        {mexTwoAddrs.map((addr) => (
          <div key={addr} className={classNames('w-5 h-5')}>
            <img
              className={classNames('w-full h-full object-cover')}
              src={getMemberAvatar(addr)}
            />
          </div>
        ))}
      </div>
    )
  }

  const renderARowWhenWidth12 = (
    maxThreeAddrs: string[],
    index: number,
    height?: string
  ) => {
    return (
      <div
        key={index}
        className={classNames(
          'flex w-full flex-row',
          height ?? '',
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
            <img
              className={classNames('object-cover w-full h-full')}
              src={getMemberAvatar(addr)}
            />
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
          renderARowWhenWidth12(arr, index, 'h-[12px]')
        )}
      </div>
    )
  }

  return (
    <div
      className={classNames(
        'relative bg-gray-200/70 rounded mr-4 my-3 flex-none',
        `w-[46px]`,
        `h-[46px]`
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

  const isUserBrowseMode = useUserBrowseMode()

  const profile = useProfile()

  let activeTab = useAppSelector((state) => state.appConifg.activeTab)
  const appDispatch = useAppDispatch()

  activeTab = isUserBrowseMode ? 'forMe' : activeTab

  const currentAddress = groupFiService.getCurrentAddress()

  const forMeTab = {
    label: 'Chat',
    key: 'forMe'
  }

  const myGroupsTab = {
    label: 'My Groups',
    key: 'ofMe'
  }

  const profileTab = {
    label: 'User',
    key: 'profile',
    flex: 'flex-none',
    render: () => {
      return (
        <div className={classNames('mx-4')}>
          {currentAddress ? (
            <img
              className={classNames('w-6 h-6 rounded-md object-cover')}
              src={
                !!profile?.avatar
                  ? profile.avatar
                  : addressToPngSrc(groupFiService.sha256Hash, currentAddress)
              }
            />
          ) : (
            ''
          )}
        </div>
      )
    }
  }

  const placeHolder = {
    label: '',
    key: 'placeholder',
    flex: 'grow basis-14'
  }

  const tabList: {
    label: string
    key: string
    flex?: string
    render?: () => JSX.Element
  }[] = isUserBrowseMode
    ? [forMeTab, placeHolder]
    : [forMeTab, myGroupsTab, profileTab]

  return tabList.map(({ label, key, flex, render }, index) => (
    <Fragment key={key}>
      {index > 0 && (
        <div
          className={classNames(
            'flex-none border-l border-black/10 dark:border-gray-600 mt-1.5 mb-1.5'
          )}
        ></div>
      )}
      <div
        onClick={() => {
          if (!label) {
            return
          }
          appDispatch(changeActiveTab(key))
        }}
        className={classNames(
          flex ? flex : 'flex-1',
          'pt-2.5 pb-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
          index === 0 ? 'rounded-tl-2xl' : undefined,
          // index === tabList.length - 1 ? 'rounded-tr-2xl' : undefined,
          activeTab === key
            ? 'text-accent-600 dark:text-accent-500'
            : 'text-black/50 dark:text-white'
        )}
      >
        {render ? render() : label}
      </div>
    </Fragment>
  ))
}

export function ButtonLoading(props: { classes?: string }) {
  return (
    <div
      className={classNames(
        'loader-spinner loader-spinner-md',
        props.classes ?? ''
      )}
    >
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}

export function GroupTitle({
  isAnnouncement,
  showAnnouncementIcon,
  showGroupPrivateIcon,
  title
}: {
  isAnnouncement?: boolean
  showAnnouncementIcon?: boolean
  showGroupPrivateIcon?: boolean
  title: string
}) {
  return (
    <div
      className={classNames(
        'flex-auto flex flex-row justify-center my-2.5 dark:text-white overflow-hidden'
      )}
    >
      {showAnnouncementIcon && (
        <AnnouncementGroupSVG
          className={classNames('inline-block mr-1 w-5 h-5 mt-[2px]')}
        />
      )}
      {showGroupPrivateIcon && (
        <PrivateGroupSVG
          className={classNames('inline-block mr-1 w-4 h-4 mt-1')}
        />
      )}
      <div
        className={classNames(
          'overflow-hidden whitespace-nowrap text-ellipsis'
        )}
      >
        {isAnnouncement ? 'Announcement' : title}
      </div>
    </div>
  )
}

export function MoreIcon({ to }: { to: string }) {
  return (
    <div
      style={{
        lineHeight: 0
      }}
      className={classNames(
        'flex-none line-height-0 ml-2.5 mr-1.5 my-1.5 w-8 h-8 flex flex-row justify-center items-center cursor-pointer'
      )}
    >
      <Link to={to}>
        {Array.from({ length: 3 }, (_, index) => index + 1).map((item, idx) => (
          <i
            key={idx}
            className={classNames(
              'w-1 h-1 bg-black dark:bg-white inline-block rounded-sm',
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
      className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-accent-600 rounded-full dark:text-accent-500"
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
        `bg-[#333] dark:bg-[#ffffff20]`,
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
            'opacity-0 bg-black dark:bg-[#3e3d3f] text-white  text-center text-xs rounded-lg py-1 absolute z-10 group-hover:opacity-100 bottom-full pointer-events-none'
          )}
        >
          {message}
          <svg
            className="absolute text-black h-2 w-full left-0 top-full dark:fill-white"
            x="0px"
            y="0px"
            viewBox="0 0 255 255"
          >
            <polygon
              className={classNames('fill-black dark:fill-[#3e3d3f]')}
              points="0,0 127.5,127.5 255,0"
            />
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
            'opacity-0 bg-white dark:bg-[#212121] py-2 px-4 text-gray-500 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-center text-sm py-1 absolute z-10 group-hover:opacity-100  pointer-events-none'
          )}
        >
          {message}
          <svg
            className={classNames('absolute h-2.5 w-full left-0 top-full')}
            x="0px"
            y="0px"
            viewBox="0 0 255 255"
          >
            <polygon
              className={classNames('fill-[lightgrey] dark:fill-gray-700')}
              points="0,0 127.5,127.5 255,0"
            />
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
        <CopySVG
          onClick={onCopy}
          onMouseLeave={() => {
            setCopied(false)
          }}
          className={classNames(
            'inline-block cursor-pointer ml-1 fill-black dark:fill-white'
          )}
        />
      </CopyTooltip>
    </div>
  )
}

export function CollapseIcon(props: { collapsed: boolean }) {
  return (
    <i
      className={classNames(
        'w-2 h-2 ml-2 rotate inline-block  border-l-2 border-[#6C737C] dark:border-white border-b-2 border-black cursor-pointer relative',
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

export function TextWithSpinner(props: { text: string }) {
  return (
    <div className={classNames('mt-1 dark:text-white')}>
      <div className={classNames('flex justify-center mt-2')}>
        <Spinner />
      </div>
      {props.text}
    </div>
  )
}

export function Powered() {
  return (
    <div
      onClick={() => {
        window.open('https://www.groupfi.ai')
      }}
      // className={classNames(
      //   'cursor-pointer hover:opacity-75 text-right absolute bottom-3 right-4 text-sm text-[#6C737C] dark:text-white'
      // )}
      className={classNames(
        'cursor-pointer hover:opacity-75 text-right text-sm pb-3 pr-4 text-[#6C737C] dark:text-white'
      )}
    >
      Powered by groupfi.ai
    </div>
  )
}
