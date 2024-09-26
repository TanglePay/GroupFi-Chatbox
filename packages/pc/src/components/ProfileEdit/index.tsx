import useProfile from 'hooks/useProfile'
import { UserNameCreation } from '../UserName'

function ProfileEdit() {
  const profile = useProfile()
  return (
    <UserNameCreation
      onMintFinish={() => {}}
      currentProfile={profile}
      hasReturnIcon={true}
    />
  )
}

export default ProfileEdit
