import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';
import { OkPacket } from 'mysql2';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

interface JobData {
  title: string;
  description: string;
  id_employer: number;
  category: string;
  state: string;
  num_workers: number;
  pay: number;
  location: string;
  time: string;
}

// Add a new job

export async function POST(request: Request) {
  const pool = initDB();
  const cookieStore = cookies();
  const authToken = await cookieStore.get('auth_token');

  if (!authToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Decode the JWT token to get user information
    const decoded = jwt.verify(authToken.value, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get the profile ID for the authenticated user
    const [profileRows] = await pool.query(
      'SELECT id_profile FROM profiles WHERE id_user = ?',
      [decoded.userId]
    );
    
    const profiles = profileRows as any[];
    if (!profiles.length) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }
    
    const profileId = profiles[0].id_profile;
    const jobData = await request.json();

    const [result] = await pool.query(
      `INSERT INTO Jobs (
        title, description, profile_id, category, 
        state, num_workers, pay, location, time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobData.title,
        jobData.description,
        profileId, // Use the profile ID we just retrieved
        jobData.category,
        jobData.state,
        jobData.num_workers,
        jobData.pay,
        jobData.location,
        jobData.time
      ]
    );

    return NextResponse.json({ 
      message: 'Job created successfully',
      id: (result as OkPacket).insertId 
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create job:', error);
    return NextResponse.json({ 
      message: 'Failed to create job',
      error: (error as Error).message 
    }, { status: 500 });
  }
}

// Add this near the top with other interfaces
interface RecommendedJobsQuery {
  userId?: string;
  category?: string;
  excludeJobId?: number;
  limit?: number;
}

// Modify the getAIRecommendations function to compare descriptions
async function getAIRecommendations(targetDescription: string, candidateDescription: string) {
  try {
    const response = await fetch(process.env.GROK_AI_API_URL!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          role: "system",
          content: "You are a job recommendation system. Compare these two job descriptions and return a similarity score between 0 and 1, where 1 means very similar and 0 means completely different. Consider skills, responsibilities, and requirements."
        }, {
          role: "user",
          content: `Compare these job descriptions:
            Description 1: ${targetDescription}
            Description 2: ${candidateDescription}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI recommendations');
    }

    const data = await response.json();
    return parseFloat(data.choices[0].message.content);
  } catch (error) {
    console.error('AI recommendation error:', error);
    return 0.5; // Default score if AI fails
  }
}

// Modify the getRecommendedJobs function
async function getRecommendedJobs(pool: any, query: RecommendedJobsQuery) {
  const { acceptedJobDescriptions, excludeJobId, limit = 5 } = query;
  
  try {
    // Get all available jobs except the excluded one
    const [jobs] = await pool.query(`
      SELECT DISTINCT j.*, p.id_profile as id_employer 
      FROM Jobs j
      JOIN Profiles p ON j.profile_id = p.id_profile
      WHERE j.id_job != ?
    `, [excludeJobId || 0]);

    // For each job, get similarity scores against all accepted job descriptions
    const jobsWithScores = await Promise.all(
      (jobs as any[]).map(async (job) => {
        // Get similarity scores for this job against all accepted job descriptions
        const similarityScores = await Promise.all(
          acceptedJobDescriptions.map(async (acceptedDesc: string) => 
            await getAIRecommendations(acceptedDesc, job.description)
          )
        );
        
        // Use the highest similarity score
        const maxSimilarity = Math.max(...similarityScores);
        
        return {
          ...job,
          relevanceScore: maxSimilarity
        };
      })
    );

    // Sort by relevance score and take top results
    const recommendedJobs = jobsWithScores
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    console.log('AI-recommended jobs:', recommendedJobs);
    return recommendedJobs;
  } catch (error) {
    console.error('Failed to get recommended jobs:', error);
    throw error;
  }
}

// Modify the GET method to handle description-based recommendations
export async function GET(request: Request) {
  const pool = initDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const profile_id = searchParams.get('profile_id');
  const getRecommended = searchParams.get('recommended');
  const category = searchParams.get('category');
  const excludeJobId = searchParams.get('excludeJobId');

  try {
    // Modify the recommendations condition
    if (getRecommended === 'true') {
      const acceptedJobDescriptions = searchParams.get('acceptedDescriptions')?.split('|') || [];
      const recommendedJobs = await getRecommendedJobs(pool, {
        acceptedJobDescriptions,
        excludeJobId: excludeJobId ? parseInt(excludeJobId) : undefined
      });
      return NextResponse.json(recommendedJobs);
    }

    if (id) {
      // Get specific job with employer information
      const [rows] = await pool.query(`
        SELECT j.*, p.id_profile as id_employer 
        FROM Jobs j
        JOIN Profiles p ON j.profile_id = p.id_profile
        WHERE j.id_job = ?
      `, [id]);
      const jobs = rows as any[];
      
      if (jobs.length === 0) {
        return NextResponse.json({ message: 'Job not found' }, { status: 404 });
      }
      
      return NextResponse.json(jobs[0]);
    } else if (profile_id) {
      // Get all jobs for a specific profile
      const [rows] = await pool.query(`
        SELECT j.*, p.id_profile as id_employer 
        FROM Jobs j
        JOIN Profiles p ON j.profile_id = p.id_profile
        WHERE j.profile_id = ?
      `, [profile_id]);
      return NextResponse.json(rows);
    } else {
      // Get all jobs with employer information
      const [rows] = await pool.query(`
        SELECT j.*, p.id_profile as id_employer 
        FROM Jobs j
        JOIN Profiles p ON j.profile_id = p.id_profile
      `);
      return NextResponse.json(rows);
    }
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Update a job
export async function PATCH(request: Request) {
  const pool = initDB();
  const { searchParams } = new URL(request.url);
  const id_job = searchParams.get('id');

  try {
    if (!id_job) {
      return NextResponse.json({ message: 'Job ID is required' }, { status: 400 });
    }

    const updateFields = await request.json();
    
    // Build dynamic query based on provided fields
    const updates = Object.keys(updateFields)
      .filter(key => updateFields[key] !== undefined)
      .map(key => `${key} = ?`);
    
    if (updates.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const query = `
      UPDATE Jobs 
      SET ${updates.join(', ')}
      WHERE id_job = ?
    `;

    // Create array of values for the query
    const values = [
      ...Object.keys(updateFields)
        .filter(key => updateFields[key] !== undefined)
        .map(key => updateFields[key]),
      id_job
    ];

    const [result] = await pool.query(query, values);
    
    const affectedRows = (result as OkPacket).affectedRows;
    
    if (affectedRows === 0) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Failed to update job:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Add DELETE method
export async function DELETE(request: Request) {
  const pool = initDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Job ID is required' }, { status: 400 });
  }

  try {
    // Start a transaction
    await pool.query('START TRANSACTION');

    // First delete related ratings
    await pool.query('DELETE FROM Ratings WHERE id_job = ?', [id]);

    // Then delete the job
    const [result] = await pool.query('DELETE FROM Jobs WHERE id_job = ?', [id]);
    
    // Commit the transaction
    await pool.query('COMMIT');

    const affectedRows = (result as OkPacket).affectedRows;
    
    if (affectedRows === 0) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' }, { status: 200 });

  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Failed to delete job:', error);
    return NextResponse.json({ 
      message: 'Failed to delete job',
      error: (error as Error).message 
    }, { status: 500 });
  }
}

// Update the OPTIONS method to ensure DELETE is included
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
    },
  });
}
