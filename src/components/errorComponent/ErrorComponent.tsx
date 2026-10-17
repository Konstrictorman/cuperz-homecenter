import { useNavigate } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import Typography from '@mui/material/Typography'
import Button from '#/components/button/Button'
import './ErrorComponent.css'
import unplugged from '../../assets/Unplugged.png'
import { userFacingErrorMessage } from '#/api/http'

type Props = ErrorComponentProps & {
  /** Shown instead of the raw error message for non-API errors (see
   *  `userFacingErrorMessage`). */
  fallbackMessage?: string
}

const ErrorComponent = ({ error, info, reset, fallbackMessage }: Props) => {
  const navigate = useNavigate()
  // The router types boundary errors as `unknown` — anything can be thrown.
  const { message, stack } = error instanceof Error ? error : {}

  return (
    <div className="error-component" role="alert">
      <Typography variant="h5" component="h1">
        ¡¡ Ocurrió un error !!
      </Typography>
      <img
        src={unplugged}
        alt="Enchufe desconectado"
        className="error-component__image"
      />
      <Typography color="text.secondary">
        {fallbackMessage
          ? userFacingErrorMessage(error, fallbackMessage)
          : message || 'Algo salió mal al cargar esta página.'}
      </Typography>
      <div className="error-component__actions">
        <Button color="error" onClick={reset} variant="contained">
          Reintentar
        </Button>
        <Button
          color="info"
          variant="contained"
          onClick={() => navigate({ to: '/' })}
        >
          Volver al panel principal
        </Button>
      </div>

      {import.meta.env.DEV && (stack || info?.componentStack) && (
        <details className="error-component__details">
          <summary>Detalles técnicos (solo en desarrollo)</summary>

          <textarea
            className="error-component__stack"
            readOnly
            value={[stack, info?.componentStack]
              .filter(Boolean)
              .join('\n\nComponent stack:\n')}
          />
        </details>
      )}
    </div>
  )
}

export default ErrorComponent
