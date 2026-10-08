import { useNavigate } from '@tanstack/react-router'
import Typography from '@mui/material/Typography'
import Button from '#/components/button/Button'
import './NotFound.css'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="not-found">
      <Typography variant="h5" component="h1">
        Página no encontrada
      </Typography>
      <Typography color="text.secondary">
        La ruta a la que intentas acceder no existe.
      </Typography>
      <Button onClick={() => navigate({ to: '/' })}>
        Volver al panel principal
      </Button>
    </div>
  )
}

export default NotFound
