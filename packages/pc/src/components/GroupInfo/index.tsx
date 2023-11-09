import { useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { classNames } from 'utils'
import RobotSVG from 'public/avatars/robot.svg'
import QuestionSVG from 'public/icons/question.svg'
import ArrowRightSVG from 'public/icons/arrrow-right.svg'
import ViewMemberSVG from 'public/icons/view-member.svg'
import MuteBigSVG from 'public/icons/mute-big.svg'
import MuteWhiteSVG from 'public/icons/mute-white.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  ReturnIcon,
  GroupTitle,
  Modal
} from '../Shared'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { useEffect, useState } from 'react'
import { Loading, AsyncActionWrapper } from 'components/Shared'
import { useGroupFiService } from 'hooks'

const maxShowMemberNumber = 15

function GroupInfo() {
  const { id: groupId } = useParams()

  if (groupId === undefined) {
    return null
  }

  const [loading, setLoading] = useState(true)

  const groupFiService = useGroupFiService()

  const userAddress = groupFiService.getUserAddress()

  console.log('***userAddress', userAddress)

  const [memberAddresses, setMemberAddresses] = useState<string[]>([])
  const [mutedAddress, setMutedAddress] = useState<string[]>([])

  const getMemberAddresses = async () => {
    const res = await groupFiService.loadGroupMemberAddresses(groupId)
    console.log('****Member Address', res)
    setMemberAddresses(res)
    setLoading(false)
  }

  const mutedMembers = async () => {
    const addressHashRes = await groupFiService.getGroupMuteMembers(groupId)
    console.log('***mutedMembers', addressHashRes)
    setMutedAddress(addressHashRes)
  }

  const refreshMutedMembers = useCallback(
    (memberAddress: string) => {
      const memberAddressHash = groupFiService.sha256Hash(memberAddress)
      setMutedAddress((s) =>
        s.includes(memberAddressHash)
          ? s.filter((i) => i !== memberAddressHash)
          : [...s, memberAddressHash]
      )
    },
    [mutedMembers]
  )

  useEffect(() => {
    getMemberAddresses()
    mutedMembers()
  }, [])

  const isGroupMember = !!memberAddresses.find(
    (address) => address === userAddress
  )

  if (loading) {
    return <Loading />
  }

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle
          showGroupIcon={false}
          title={`Group (${memberAddresses.length})`}
        />
      </HeaderWrapper>
      <ContentWrapper>
        {memberAddresses.length > 0 && (
          <div
            className={classNames(
              'grid grid-cols-[repeat(5,1fr)] gap-x-3.5 gap-y-2 px-15px pt-5 pb-3'
            )}
          >
            {memberAddresses.map((memberAddress, index) => (
              <Member
                groupId={groupId}
                isGroupMember={isGroupMember}
                avatar={RobotSVG}
                muted={mutedAddress.includes(
                  groupFiService.sha256Hash(memberAddress)
                )}
                address={memberAddress}
                key={memberAddress}
                isLastOne={(index + 1) % 5 === 0}
                name={memberAddress.slice(memberAddress.length - 5)}
                userAddress={userAddress}
                refresh={refreshMutedMembers}
              />
            ))}
          </div>
        )}
        {memberAddresses.length > maxShowMemberNumber && <ViewMoreMembers />}
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <GroupStatus isGroupMember={isGroupMember} groupId={groupId} />
        </div>
        {isGroupMember && (
          <div className={classNames('mx-5 border-t border-black/10 py-4')}>
            <ReputationInGroup groupId={groupId} />
          </div>
        )}
        <LeaveOrUnMark groupId={groupId} isGroupMember={isGroupMember} />
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function Member(props: {
  avatar: string
  muted: boolean
  isLastOne: boolean
  name: string
  address: string
  isGroupMember: boolean
  userAddress: string | undefined
  groupId: string
  refresh: (address: string) => void
}) {
  const {
    avatar,
    address,
    isLastOne,
    userAddress,
    isGroupMember,
    muted,
    name,
    groupId,
    refresh
  } = props
  const navigate = useNavigate()
  const [menuShow, setMenuShow] = useState(false)

  const groupFiService = useGroupFiService()

  return (
    <div
      className={classNames('relative')}
      onMouseLeave={() => {
        if (menuShow) {
          setMenuShow(false)
        }
      }}
    >
      <div className={classNames('w-14 cursor-pointer')}>
        <div className={classNames('relative')}>
          <img
            onClick={() => {
              setMenuShow((s) => !s)
            }}
            className={classNames('rounded-lg w-full h-14')}
            src={avatar}
          />
          {muted && (
            <img
              className={classNames('absolute right-0 bottom-0')}
              src={MuteWhiteSVG}
            />
          )}
        </div>
        <p
          className={classNames('text-xs opacity-50 text-center mt-1 truncate')}
        >
          {name}
        </p>
      </div>
      <div
        className={classNames(
          'absolute left-0 min-w-[88px] top-[50px] z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuShow ? 'block' : 'hidden',
          isLastOne ? 'left-[-14px]' : 'left-0'
        )}
      >
        {[
          {
            text: 'View',
            onClick: () => {
              navigate(`/user/${address}`)
            },
            icon: ViewMemberSVG,
            async: false
          },
          ...(isGroupMember && address !== userAddress
            ? [
                {
                  text: muted ? 'NUMUTE' : 'Mute',
                  onClick: async () => {
                    if (muted) {
                      console.log('***unmute group member start')
                      await groupFiService.unMuteGroupMember(groupId, address)
                      console.log('***unmute group member end')
                    } else {
                      console.log('***mute group member start')
                      await groupFiService.muteGroupMember(groupId, address)
                      console.log('***mute group member end')
                    }
                  },
                  icon: MuteBigSVG
                }
              ]
            : [])
        ].map(({ text, onClick, icon, async }) => (
          <AsyncActionWrapper
            onClick={onClick}
            async={async}
            onCallback={() => refresh(address)}
          >
            <div
              className={classNames(
                'text-sm py-3.5 px-3 cursor-pointer relative'
              )}
            >
              <img
                src={icon}
                className={classNames('h-[18px] absolute top-4')}
              />
              <span className={classNames('pl-7 font-medium')}>{text}</span>
            </div>
          </AsyncActionWrapper>
        ))}
      </div>
    </div>
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
        <img src={ArrowRightSVG} className={classNames('ml-1 mt-px')} />
      </span>
    </div>
  )
}

function GroupStatus(props: { isGroupMember: boolean; groupId: string }) {
  const { groupId } = props
  const { messageDomain } = useMessageDomain()
  const groupFiService = useGroupFiService()

  const [isPublic, setIsPublic] = useState<boolean | undefined>(undefined)

  const getIsGroupPublic = async () => {
    const res = await groupFiService.isGroupPublic(groupId)
    setIsPublic(res)
  }

  useEffect(() => {
    getIsGroupPublic()
  }, [])

  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>Group Status</div>
      <div className={classNames('flex-none')}>
        {isPublic === undefined
          ? 'loading...'
          : isPublic
          ? 'Public'
          : 'Private'}
      </div>
      {props.isGroupMember && (
        <Vote groupId={groupId} refresh={getIsGroupPublic} />
      )}
    </div>
  )
}

function Vote(props: { groupId: string; refresh?: () => Promise<void> }) {
  const { groupId, refresh } = props

  const groupFiService = useGroupFiService()

  const [votesCount, setVotesCount] = useState<{
    0: number
    1: number
  }>()

  const [voteRes, setVoteRes] = useState<0 | 1>()

  const [menuShow, setMenuShow] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const getVoteResAndvotesCount = async () => {
    const groupVotesCount = await groupFiService.loadGroupVotesCount(groupId)
    console.log('***groupVotesCount', groupVotesCount)
    const voteRes = (await groupFiService.getGroupVoteRes(groupId)) as
      | 0
      | 1
      | undefined
    console.log('***voteRes', voteRes)
    setVotesCount({
      0: groupVotesCount.publicCount,
      1: groupVotesCount.privateCount
    })
    setVoteRes(voteRes)
  }

  useEffect(() => {
    getVoteResAndvotesCount()
  }, [])

  const onVote = async (vote: 0 | 1) => {
    try {
      if (voteRes === vote) {
        console.log('$$$unvote start')
        // unvote
        await groupFiService.voteOrUnVoteGroup(groupId, undefined)
        setVotesCount((s) => {
          if (s === undefined) {
            return s
          }
          return {
            ...s,
            [vote]: s[vote] - 1
          }
        })
        setVoteRes(undefined)
        console.log('$$$unvote end')
      } else {
        console.log('$$$vote start:', vote)
        // vote
        await groupFiService.voteOrUnVoteGroup(groupId, vote)
        setVotesCount((s) => {
          if (s === undefined) {
            return s
          }
          if (voteRes === undefined) {
            return {
              ...s,
              [vote]: s[vote] + 1
            }
          } else {
            return {
              ...s,
              [voteRes]: s[voteRes] - 1,
              [vote]: s[vote] + 1
            }
          }
        })
        setVoteRes(vote)
        console.log('$$$vote end:', vote)
      }
      setTimeout(() => {
        if (refresh) {
          refresh()
        }
      }, 3000)
    } catch (error) {
      console.log('***onVote Error', error)
    }
  }

  const onMouseEnter = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!menuShow) {
      setMenuShow(true)
    }
  }
  const onMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setMenuShow(false)
    }, 250)
  }
  return (
    <div className="relative">
      <div>
        <div
          className={classNames('flex-none ml-4 text-primary cursor-pointer')}
          onMouseOver={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          VOTE
        </div>
      </div>
      <div
        className={classNames(
          'absolute right-0 w-24 z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuShow ? 'block' : 'hidden'
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {[
          {
            text: 'Public',
            value: 0,
            number: votesCount?.['0'] ?? ''
          },
          {
            text: 'Private',
            value: 1,
            number: votesCount?.['1'] ?? ''
          }
        ].map(({ text, number, value }) => (
          <AsyncActionWrapper
            onClick={() => {
              return onVote(value as 0 | 1)
            }}
          >
            <div
              className={classNames(
                'text-sm py-3.5 px-3 flex cursor-pointer',
                voteRes === value ? 'text-[#3671EE]' : 'text-[#333]'
              )}
            >
              {text}
              <span
                className={classNames(
                  'w-[18px] h-[18px] text-center ml-[auto] font-medium'
                )}
              >
                {number}
              </span>
            </div>
          </AsyncActionWrapper>
        ))}
      </div>
    </div>
  )
}

function ReputationInGroup(props: { groupId: string }) {
  const { groupId } = props
  const groupFiService = useGroupFiService()
  const [reputation, setReputation] = useState<number>()

  const getReputation = async () => {
    try {
      const res = await groupFiService.getUserGroupReputation(groupId)
      console.log('****Get Reputation', res)
      setReputation(res.reputation)
    } catch (error) {
      console.log('****Get Reputation error', error)
    }
  }

  useEffect(() => {
    getReputation()
  }, [])

  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>
        <span>My Reputation in Group</span>
        <img src={QuestionSVG} className={classNames('inline-block ml-2')} />
      </div>
      <div className={classNames('flex-none ml-4 font-medium')}>
        {reputation ?? ''}
      </div>
    </div>
  )
}

function LeaveOrUnMark(props: { groupId: string; isGroupMember: boolean }) {
  const { groupId, isGroupMember } = props

  const navigate = useNavigate()

  const [modalShow, setModalShow] = useState(false)

  const [marked, setMarked] = useState<boolean>()

  const groupFiService = useGroupFiService()

  const getGroupMarked = async () => {
    console.log('***getGroupMarked start')
    const res = await groupFiService.getGroupMarked(groupId)
    console.log('***getGroupMarked end', res)
    setMarked(res)
  }

  useEffect(() => {
    getGroupMarked()
  }, [])

  const hide = () => {
    setModalShow(false)
  }

  const onLeave = async () => {
    await groupFiService.leaveGroup(groupId)
    if (isGroupMember) {
      navigate('/')
    } else if (marked) {
      setMarked(false)
    }
  }

  if (marked === undefined) {
    return null
  }

  if (marked === false && !isGroupMember) {
    return null
  }

  const text = isGroupMember
    ? { verb: 'Leave', verbing: 'Leaving' }
    : marked
    ? { verb: 'Unmark', verbing: 'Unmarking' }
    : undefined

  return (
    <>
      <div
        className={classNames(
          'absolute left-0 bottom-0 w-full px-5 text-center'
        )}
      >
        <div
          className={classNames(
            'border-t border-black/10 pt-4 pb-5 text-[#D53554] text-sm cursor-pointer'
          )}
          onClick={() => {
            setModalShow((s) => !s)
          }}
        >
          {text?.verb}
        </div>
      </div>
      <Modal show={modalShow} hide={hide}>
        <LeaveOrUnMarkDialog
          hide={hide}
          groupId={groupId}
          text={text}
          onLeave={onLeave}
        />
      </Modal>
    </>
  )
}

function LeaveOrUnMarkDialog(props: {
  hide: () => void
  groupId: string
  onLeave: () => Promise<void>
  text:
    | {
        verb: string
        verbing: string
      }
    | undefined
}) {
  const { hide, groupId, text, onLeave } = props
  const groupFiService = useGroupFiService()

  const [loading, setLoading] = useState(false)

  return (
    <div className={classNames('w-[334px] bg-white rounded-2xl p-4')}>
      <div className={classNames('text-center font-medium')}>
        {text?.verbing} Group Chat “{groupFiService.groupIdToGroupName(groupId)}
        ”
      </div>
      <div className={classNames('mt-4 flex font-medium justify-between')}>
        {[
          {
            text: 'Cancel',
            onClick: () => {
              hide()
            },
            className: 'bg-[#F2F2F7]'
          },
          {
            text: loading ? 'Loading...' : text?.verb,
            onClick: async () => {
              try {
                setLoading(true)
                await onLeave()
                console.log('***Leave group')
              } catch (error) {
                console.log('***Leave group error', error)
              } finally {
                setLoading(false)
                hide()
              }
            },
            className: 'bg-[#D53554] text-white'
          }
        ].map(({ text, onClick, className }) => (
          <button
            className={classNames(
              'w-[143px] text-center py-3 rounded-[10px]',
              className
            )}
            onClick={() => {
              if (loading) {
                return
              }
              onClick()
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default GroupInfo
