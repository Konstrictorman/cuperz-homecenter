import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <Card className="w-[240px] sm:w-[480px]">
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome to Cuperz Home Center!
          </Typography>
          <Typography variant="body1" component="p">
            This is the home page of your Cuperz application. You can start
            building your app by editing the files in the <code>src</code>{' '}
            directory.
          </Typography>
        </CardContent>
      </Card>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
    </div>
  )
}
