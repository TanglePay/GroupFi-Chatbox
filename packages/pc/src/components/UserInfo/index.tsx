import { useParams } from 'react-router-dom'
import RobotSVG from 'public/avatars/robot.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  GroupTitle,
  ReturnIcon,
  ContentWrapper,
  Copy,
  Tooltip
} from '../Shared'
import { classNames } from 'utils'

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
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <div className={classNames('font-medium text-[#333]')}>NFT</div>
        </div>
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <div className={classNames('font-medium text-[#333]')}>GROUPS</div>
        </div>
      </ContentWrapper>
    </ContainerWrapper>
  )
}

export default UserInfo
