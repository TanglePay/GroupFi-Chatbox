import { useParams } from 'react-router-dom'
import RobotSVG from 'public/avatars/robot.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  GroupTitle,
  ReturnIcon,
  ContentWrapper,
  Copy,
  CollapseIcon
} from '../Shared'
import { classNames } from 'utils'
import { useState } from 'react'

function UserInfo() {
  const { id: userId } = useParams()

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle showGroupIcon={false} title={'DETAILS'} />
      </HeaderWrapper>
      <ContentWrapper>
        <div className={classNames('py-5 pl-5 flex flex-row')}>
          <img src={RobotSVG} className={classNames('w-[73px] h-[73px]')} />
          <div className={classNames('pt-1 pr-5 pl-4')}>
            <div className={classNames('font-medium text-[#333]')}>Name</div>
            <div
              className={classNames(
                'break-all text-xs text-[#6C737C] leading-5 mt-1'
              )}
            >
              {userId}
              <Copy text={userId ?? ''} />
            </div>
          </div>
        </div>
        <UserInfoCollapse title="NFT" />
        <UserInfoCollapse title="GROUPS" />
        {/* <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <h3 className={classNames('font-medium text-[#333] inline-block')}>
            NFT
          </h3>
          <Collapse collapsed={true} />
        </div>
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <h3 className={classNames('font-medium text-[#333] inline-block')}>
            GROUPS
          </h3>
          <Collapse collapsed={true} />
        </div> */}
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function UserInfoCollapse(props: { title: string }) {
  const { title } = props
  const [collapsed, setCollapsed] = useState(true)
  return (
    <div
      onClick={() => {
        setCollapsed((s) => !s)
      }}
      className={classNames(
        'mx-5 cursor-pointer select-none border-t border-black/10 py-4'
      )}
    >
      <h3 className={classNames('font-medium text-[#333] inline-block mr-1.5')}>
        {title}
      </h3>
      <CollapseIcon collapsed={collapsed} />
    </div>
  )
}

export default UserInfo
