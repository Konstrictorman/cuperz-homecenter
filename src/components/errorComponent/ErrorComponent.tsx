import { useNavigate } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import Typography from '@mui/material/Typography'
import Button from '#/components/button/Button'
import './ErrorComponent.css'
import unplugged from '../../assets/Unplugged.png'
import { userFacingErrorMessage } from '#/api/http'

const ErrorComponent = ({
  error,
  info,
  reset,
  fallbackMessage,
}: ErrorComponentProps) => {
  const navigate = useNavigate()

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
          : error.message || 'Algo salió mal al cargar esta página.'}
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

      {import.meta.env.DEV && (error.stack || info?.componentStack) && (
        <details className="error-component__details">
          <summary>Detalles técnicos (solo en desarrollo)</summary>

          <textarea
            className="error-component__stack"
            readOnly
            value={[error.stack, info?.componentStack]
              .filter(Boolean)
              .join('\n\nComponent stack:\n')}
          />
        </details>
      )}
    </div>
  )
}

export default ErrorComponent
