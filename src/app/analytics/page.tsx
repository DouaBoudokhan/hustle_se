'use client';
import { useEffect, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { CategoryScale } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Card,
  CardContent,
  CardHeader,
  useTheme,
  CircularProgress
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import WorkIcon from '@mui/icons-material/Work';

Chart.register(CategoryScale);

interface AnalyticsData {
  trendingCategories: Array<{
    category: string;
    count: number;
  }>;
  avgPayByCategory: Array<{
    category: string;
    avgPay: number;
  }>;
  competitiveJobs: Array<{
    title: string;
    application_count: number;
  }>;
  jobsOverTime: Array<{
    date: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    time: string;
    category: string;
  }>;
}

const CHART_COLORS = {
  primary: ['#17897f', '#1a9989', '#1da893', '#20b7a0', '#23c6ac'],  // Darker shades
  secondary: ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'],
  text: '#334155',
  grid: '#e2e8f0'
};

export default function Analytics() {
  const theme = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/job/analytics');
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress sx={{ color: '#17897f' }} />
      </Box>
    );
  }

  if (!analyticsData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography variant="h6" color="error">Failed to load analytics</Typography>
      </Box>
    );
  }

  const categoryChartData = {
    labels: analyticsData.trendingCategories.map(item => item.category),
    datasets: [{
      label: 'Number of Jobs',
      data: analyticsData.trendingCategories.map(item => item.count),
      backgroundColor: '#17897f',
    }]
  };

  const payChartData = {
    labels: analyticsData.avgPayByCategory.map(item => item.category),
    datasets: [{
      label: 'Average Pay Rate ($/hr)',
      data: analyticsData.avgPayByCategory.map(item => item.avgPay),
      backgroundColor: '#1a9989',
    }]
  };

  const competitiveJobsData = {
    labels: analyticsData.competitiveJobs.map(item => item.title),
    datasets: [{
      data: analyticsData.competitiveJobs.map(item => item.application_count),
      backgroundColor: CHART_COLORS.primary,
    }]
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6, fontWeight: 'bold' }}>
        Job Market Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Trending Categories Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Trending Job Categories"
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<TimelineIcon sx={{ color: '#17897f' }} />}
            />
            <CardContent>
              <Box height={300}>
                <Bar data={categoryChartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  }
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Pay Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Average Pay by Category"
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<WorkIcon sx={{ color: '#17897f' }} />}
            />
            <CardContent>
              <Box height={300}>
                <Bar data={payChartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  }
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Competitive Jobs Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Most Competitive Jobs"
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent>
              <Box height={300}>
                <Doughnut data={competitiveJobsData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Statistics */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Key Statistics"
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                Job Counts
              </Typography>
              <List>
                {analyticsData.trendingCategories.map((category, index) => (
                  <ListItem key={`count-${index}`} divider={index !== analyticsData.trendingCategories.length - 1}>
                    <ListItemText primary={category.category} />
                    <Chip 
                      label={`${category.count} jobs`}
                      sx={{ 
                        bgcolor: '#17897f',
                        color: 'white',
                        '&:hover': { bgcolor: '#147870' }
                      }}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                Latest Activity
              </Typography>
              <List>
                {analyticsData.recentActivity
                  .filter(activity => activity.type === 'New Job')
                  .map((activity, index) => (
                    <ListItem key={`activity-${index}`} divider={index !== analyticsData.recentActivity.length - 1}>
                      <ListItemText 
                        primary={activity.title}
                        secondary={new Date(activity.time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      />
                      <Chip 
                        label="New Job"
                        sx={{ 
                          bgcolor: '#17897f',
                          color: 'white',
                          '&:hover': { bgcolor: '#147870' }
                        }}
                      />
                    </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}