import useContextField from './useContextField'

const useIsForMeGroupsLoading = () => {
  const isForMeGroupsLoading = useContextField<boolean>('isForMeGroupsLoading')

  return isForMeGroupsLoading
}

export default useIsForMeGroupsLoading
