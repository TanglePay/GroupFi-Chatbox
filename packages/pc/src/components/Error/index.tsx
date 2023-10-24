function ErrorPage(props: {
  content: string
}) {
  const { content } = props
  return <div>Something wrong: {content}...</div>
}

export default ErrorPage