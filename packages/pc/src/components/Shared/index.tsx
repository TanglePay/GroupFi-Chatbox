import { PropsWithChildren, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { classNames } from 'utils'
import CopySVG from 'public/icons/copy.svg'

import { Link } from 'react-router-dom'

import GroupSVG from 'public/icons/group.svg'

export function AppWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div
      className={classNames('w-full h-full border border-black/10 rounded-2xl')}
    >
      {children}
    </div>
  )
}

export function ContainerWrapper({ children }: PropsWithChildren<{}>) {
  return <div className={classNames('flex flex-col h-full')}>{children}</div>
}

export function HeaderWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div
      className={classNames(
        'flex-none border-b border-black/10 flex flex-row text-center font-medium'
      )}
    >
      {children}
    </div>
  )
}

export function ContentWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div className={classNames('flex-1 overflow-x-hidden overflow-y-scroll')}>
      {children}
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

export function GroupTitle({
  showGroupIcon,
  title
}: {
  showGroupIcon?: boolean
  title: string
}) {
  return (
    <div
      className={classNames(
        'flex-none w-247px my-2.5 flex flex-row justify-center items-center'
      )}
    >
      {showGroupIcon && (
        <i className={classNames('w-4 h-4 mr-2.5')}>
          <img src={GroupSVG} />
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
        'flex-none ml-2.5 mr-4 my-1.5 w-8 h-8 flex flex-row justify-center items-center cursor-pointer'
      )}
    >
      <Link to={to}>
        {Array.from({ length: 3 }, (_, index) => index + 1).map((item) => (
          <i
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
}) {
  return (
    <div
      className={classNames(
        'w-full flex flex-row justify-center justify-items-center',
        marginTop
      )}
    >
      <div className={type}></div>
    </div>
  )
}

export function LoadingModal() {
  return (
    <Modal
      show={true}
      hide={() => {}}
      opacity={10}
      component={() => <Loading type="dot-pulse" marginTop="mt-0" />}
    />
  )
}

export function Modal(props: {
  show: boolean
  hide: () => void
  component: (props: { hide: () => void }) => JSX.Element
  opacity?: number
  bgColor?: string
}) {
  const {
    show,
    hide,
    component: Component,
    opacity = 50,
    bgColor = 'black'
  } = props
  if (!show) {
    return false
  }
  return createPortal(
    <div
      className={classNames(
        `bg-${bgColor}`,
        'absolute left-0 top-0 rounded-2xl inset-0 transition-opacity flex justify-center items-center z-[100] bg-opacity-50'
      )}
      onClick={(event) => {
        hide()
        event.stopPropagation()
      }}
    >
      <Component hide={hide} />
    </div>,
    document.getElementById('root')!
  )
}

export function AsyncActionWrapper({
  children,
  onCallback,
  onClick
}: PropsWithChildren<{
  onCallback?: () => void
  onClick: () => Promise<void>
}>) {
  const [loading, setLoading] = useState(false)
  return (
    <div
      onClick={async () => {
        try {
          setLoading(true)
          await onClick()
          if (onCallback) {
            onCallback()
          }
        } catch (error) {
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

export function Tooltip({
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

export function Copy(props: { text: string }) {
  const { text } = props
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch (error) {
      console.log('Copy error', error)
    }
  }
  return (
    <div className={classNames('inline-block')}>
      <Tooltip message={copied ? 'Copied' : 'Copy'}>
        <img
          onClick={onCopy}
          onMouseLeave={() => {
            setCopied(false)
          }}
          src={CopySVG}
          className={classNames('inline-block cursor-pointer py-2 px-2')}
        />
      </Tooltip>
    </div>
  )
}
