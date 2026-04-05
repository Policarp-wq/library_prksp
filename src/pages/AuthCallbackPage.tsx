import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { completePkceLogin } from '../features/auth/authSlice'
import { clearPkceSession, readPkceState, readPkceVerifier } from '../features/auth/pkce'

function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { status, error } = useAppSelector((state) => state.auth)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const expectedState = readPkceState()
    const codeVerifier = readPkceVerifier()

    if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
      navigate('/auth', { replace: true })
      return
    }

    dispatch(completePkceLogin({ code, codeVerifier }))
      .unwrap()
      .then(() => {
        clearPkceSession()
        navigate('/', { replace: true })
      })
      .catch(() => {
        clearPkceSession()
      })
  }, [dispatch, navigate, searchParams])

  return (
    <section>
      <h1>Завершение авторизации...</h1>
      {status === 'loading' ? <p>Обмениваем authorization code на токен.</p> : null}
      {error ? <p>{error}</p> : null}
    </section>
  )
}

export default AuthCallbackPage
