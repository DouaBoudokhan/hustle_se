'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextField, Button, Grid, MenuItem, Select, InputLabel, FormControl, Box, Typography } from '@mui/material';
import { generateInterviewPDF } from '@/utils/pdfGenerator';

interface JobFormData {
  title: string;
  description: string;
  category: string;
  state: string;
  num_workers: number;
  pay: number;
  location: string;
  time: string;
}

export default function JobAdd() {
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    category: '',
    state: '',
    num_workers: 1,
    pay: 0,
    location: '',
    time: new Date().toISOString(),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'num_workers' || name === 'pay' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        const questionsResponse = await fetch('/api/ai/interview-prep', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobDescription: formData.description,
            title: formData.title,
            category: formData.category,
          }),
        });

        if (questionsResponse.ok) {
          const data = await questionsResponse.json();
          generateInterviewPDF(data.questions, data.jobTitle, data.category);
        }

        alert('Job posted successfully! Interview questions PDF has been generated.');
        router.push('/job');
      } else {
        alert('Failed to post job: ' + result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error posting job. Please try again.');
    }
  };

  return (
    <Box component="main" sx={{ my: 4 }}>
      <Grid container justifyContent="center">
        <Grid item xs={12} sm={8} md={6}>
          <Box className="card shadow" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h5" align="center" sx={{ mb: 4 }}>Post a New Job</Typography>

            <form onSubmit={handleSubmit}>
              {/* Job Title */}
              <TextField
                label="Job Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                required
                sx={{ mb: 3 }}
              />

              {/* Job Description */}
              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                required
                sx={{ mb: 3 }}
              />

              {/* Category */}
              <FormControl fullWidth required sx={{ mb: 3 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  label="Category"
                >
                  <MenuItem value="">Select a category</MenuItem>
                  <MenuItem value="Warehouse Worker">Warehouse Worker</MenuItem>
                  <MenuItem value="Handyman">Handyman</MenuItem>
                  <MenuItem value="Delivery">Delivery</MenuItem>
                  <MenuItem value="Gardener">Gardener</MenuItem>
                  <MenuItem value="Pet Sitter">Pet Sitter</MenuItem>
                  <MenuItem value="Babysitter">Babysitter</MenuItem>
                  <MenuItem value="Janitor">Janitor</MenuItem>
                  <MenuItem value="Security Guard">Security Guard</MenuItem>
                  <MenuItem value="Musician/Performer">Musician/Performer</MenuItem>
                  <MenuItem value="Waiter/Cook">Waiter/Cook</MenuItem>
                  <MenuItem value="Cashier">Cashier</MenuItem>
                  <MenuItem value="Tutor">Tutor</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>

              {/* Location and State */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    fullWidth
                    required
                    sx={{ mb: 3 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    fullWidth
                    required
                    sx={{ mb: 3 }}
                  />
                </Grid>
              </Grid>

              {/* Pay and Workers */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Pay Rate ($/hr)"
                    name="pay"
                    type="number"
                    value={formData.pay}
                    onChange={handleChange}
                    fullWidth
                    required
                    sx={{ mb: 3 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Workers"
                    name="num_workers"
                    type="number"
                    value={formData.num_workers}
                    onChange={handleChange}
                    fullWidth
                    required
                    sx={{ mb: 3 }}
                  />
                </Grid>
              </Grid>

              {/* Submit Button */}
              <Grid container spacing={2} justifyContent="center">
                <Grid item>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    sx={{ width: '100%', backgroundColor: '#17a589', '&:hover': { backgroundColor: '#15887e' } }}
                  >
                    Post Job
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={() => router.push('/job')}
                    sx={{ width: '100%' }}
                  >
                    Cancel
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
