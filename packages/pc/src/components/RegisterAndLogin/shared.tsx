import { useState } from 'react'
import { classNames } from 'utils'
import TanglePayLogoSVG from 'public/icons/tanglepay-logo-1.svg'
import useUIConfig from 'hooks/useUIConfig'

export function LogoAndTitle(props: { title: string; subTitle: string }) {
  const { title, subTitle } = props
  const uiConfig = useUIConfig()
  const [url, setUrl] = useState<string>(uiConfig?.logoUrl ?? TanglePayLogoSVG)

  const finalTitle = uiConfig?.title ?? title
  const finalSubTitle = uiConfig?.subTitle ?? subTitle

  return (
    <div className={classNames('flex flex-col items-center')}>
      <img
        onError={() => {
          setUrl(TanglePayLogoSVG)
        }}
        src={url}
        className={classNames('w-32 h-32 object-cover')}
      />
      <div className={classNames('text-center mt-3')}>
        <div className={classNames('font-bold text-accent-600 dark:text-accent-500 text-2xl')}>
          {finalTitle}
        </div>
        <div className={classNames('pt-2 text-accent-600 dark:text-accent-500 text-sm')}>
          {finalSubTitle}
        </div>
      </div>
    </div>
  )
} 