import { useNavigate } from '@tanstack/react-router'
import Typography from '@mui/material/Typography'
import Button from '#/components/button/Button'
import './NotFound.css'
import shyBear from '../../assets/Shy Blushing Bear Avatar.png'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="not-found">
      <Typography variant="h3" component="h1">
        Página no encontrada
      </Typography>
      <Typography color="text.secondary">
        La ruta a la que intentas acceder no existe.
      </Typography>
      <Typography variant="h4">¡¡ Qué Oso !!</Typography>
      <img src={shyBear} alt="Oso tímido" className="not-found__image" />
      <div className="not-found__spacer" />
      <Button
        variant="contained"
        color="info"
        onClick={() => navigate({ to: '/' })}
      >
        Volver al panel principal
      </Button>
    </div>
  )
}

export default NotFound
