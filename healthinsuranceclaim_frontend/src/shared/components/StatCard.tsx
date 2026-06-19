import { Box, Typography, Card, CardContent } from '@mui/material';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

export const StatCard = ({ title, value, icon }: StatCardProps) => (
  <Card elevation={1}>
    <CardContent sx={{ textAlign: 'center', py: 3 }}>
      <Box sx={{ color: 'primary.main', mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h4" color="primary.main" gutterBottom>
        {value || 0}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </CardContent>
  </Card>
);