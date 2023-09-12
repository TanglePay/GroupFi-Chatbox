import { AddOutline, RightOutline } from 'antd-mobile-icons'
import { classNames } from 'utils'
import IotaKeySVG from 'public/avatars/iotakey.svg'
import RobotSVG from 'public/avatars/robot.svg'
import IotaapeSVG from 'public/avatars/iotaape.svg'
import QuestionSVG from 'public/icons/question.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  ReturnIcon,
  GroupTitle
} from '../Shared'

function GroupInfo() {
  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle showGroupIcon={false} title={'Group (3)'} />
      </HeaderWrapper>
      <ContentWrapper>
        <div
          className={classNames(
            'grid grid-cols-[repeat(5,auto)] gap-x-3.5 gap-y-3 px-15px pt-5 pb-3'
          )}
        >
          {[
            IotaKeySVG,
            RobotSVG,
            IotaapeSVG,
            IotaKeySVG,
            RobotSVG,
            IotaapeSVG,
            IotaapeSVG,
            IotaKeySVG,
            IotaapeSVG,
            IotaapeSVG,
            IotaKeySVG,
            IotaKeySVG,
            RobotSVG,
            IotaapeSVG
          ].map((src) => (
            <div className={classNames('w-14')}>
              <img className={classNames('rounded-lg w-full h-14')} src={src} />
              <p
                className={classNames(
                  'text-xs opacity-50 text-center mt-1 truncate'
                )}
              >
                abby.eth
              </p>
            </div>
          ))}
          <div
            className={classNames(
              'w-14 h-14 flex flex-row justify-center items-center border border-black/10 border-dashed rounded-lg text-black/20 cursor-pointer'
            )}
          >
            <AddOutline fontSize={32} />
          </div>
        </div>
        <ViewMoreMembers />
        {[GroupStatus, ReputationInGroup].map((Component) => (
          <div className={classNames('mx-5 border-t border-black/10 py-4')}>
            <Component />
          </div>
        ))}
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function ViewMoreMembers() {
  return (
    <div className={classNames('text-center mb-5')}>
      <span
        className={classNames(
          'inline-flex flex-row justify-center items-center text-sm text-black/50 cursor-pointer'
        )}
      >
        View More Members
        <RightOutline fontSize={14} />
      </span>
    </div>
  )
}

function GroupStatus() {
  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>Group Status</div>
      <div className={classNames('flex-none')}>Private</div>
      <div className={classNames('flex-none ml-4 text-primary')}>VOTE</div>
    </div>
  )
}

function ReputationInGroup() {
  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>
        <span>My Reputation in Group</span>
        <img src={QuestionSVG} className={classNames('inline-block ml-2')} />
      </div>
      <div className={classNames('flex-none ml-4 font-medium')}>65</div>
    </div>
  )
}

export default GroupInfo
