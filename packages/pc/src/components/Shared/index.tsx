import { PropsWithChildren, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { classNames } from 'utils'

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
  showGroupIcon = true,
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

export function Loading({ marginTop = 'mt-20' }: { marginTop?: string }) {
  return (
    <div className={classNames('text-center', marginTop)}>
      <div role="status">
        <svg
          aria-hidden="true"
          className={classNames(
            'inline w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600'
          )}
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

export function Modal(props: {
  show: boolean
  hide: () => void
  component: (props: { hide: () => void }) => JSX.Element
}) {
  const { show, hide, component: Component } = props
  if (!show) {
    return false
  }
  return createPortal(
    <div
      className="absolute left-0 top-0 rounded-2xl inset-0 bg-black bg-opacity-50 transition-opacity flex justify-center items-center"
      onClick={() => {
        hide()
      }}
    >
      <Component hide={hide} />
    </div>,
    document.getElementById('root')!
  )
}