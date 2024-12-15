import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';

interface RatingData {
  id_user: number;
  id_subject: number;
  value: number;
  id_job?: number;
  feedback?: string;
}

// Ajouter la fonction au début du fichier, après les imports
const containsInappropriateContent = (feedback: string): boolean => {
  const inappropriateWords = [
    'fuck', 'shit', 'ass', 'bitch', 
    // Ajoutez d'autres mots inappropriés ici
  ];
  return inappropriateWords.some(word => 
    feedback.toLowerCase().includes(word.toLowerCase())
  );
};

// Add this new function before your route handlers
async function generateAdvice(feedbacks: any[]) {
  console.log('Generating advice for feedbacks:', feedbacks);

  try {
    // Prepare feedback summary
    const feedbackSummary = feedbacks.map(feedback =>
      `Rating: ${feedback.value}/5, Feedback: "${feedback.feedback}"`
    ).join('\n');

    const prompt = `You are an expert career advisor. Analyze these job performance reviews and provide detailed professional advice:

${feedbackSummary}

Please provide:
1. A detailed analysis of their performance based on the ratings and feedback
2. Specific strengths identified from positive feedback
3. Clear areas for improvement based on critical feedback
4. Actionable recommendations for professional growth
5. Suggestions for handling difficult situations mentioned in the feedback

Format your response with clear sections and bullet points. Be constructive and specific.`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: prompt
        }],
        model: "grok-1",
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get Grok analysis');
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    // If Grok fails to provide analysis, fall back to basic analysis
    if (!advice) {
      throw new Error('No advice generated');
    }

    return advice;

  } catch (error) {
    console.error('Error getting Grok analysis:', error);
    
    // Fallback to basic analysis
    const averageRating = feedbacks.reduce((acc, f) => acc + Number(f.value), 0) / feedbacks.length;
    const positiveFeedbacks = feedbacks.filter(f => Number(f.value) >= 4);
    const negativeFeedbacks = feedbacks.filter(f => Number(f.value) <= 2);

    return `Performance Analysis Based on ${feedbacks.length} Reviews

Overall Performance:
• Average Rating: ${averageRating.toFixed(1)}/5
• Total Reviews: ${feedbacks.length}
• Positive Reviews: ${positiveFeedbacks.length}
• Areas for Improvement: ${negativeFeedbacks.length}

Key Points:
${feedbacks.map(f => `• Rating ${f.value}/5: ${f.feedback || 'No comment provided'}`).join('\n')}

${averageRating >= 4 ? 'Overall excellent performance. Keep up the good work!' : 
  averageRating >= 3 ? 'Good performance with some areas for improvement.' :
  'Several areas need attention for improvement.'}
`;
  }
}

// CREATE (POST)
export async function POST(request: Request) {
  const pool = initDB();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const { id_user, id_subject, id_job, value, feedback } = body;
    console.log('Received rating data:', body);

    await connection.beginTransaction();

    // Insert the rating
    const [ratingResult] = await connection.query(
      `INSERT INTO ratings (id_user, id_subject, id_job, value, feedback)
       VALUES (?, ?, ?, ?, ?)`,
      [id_user, id_subject, id_job, value, feedback]
    );

    await connection.commit();

    return NextResponse.json({ 
      message: 'Rating created successfully',
      rating: {
        id_rating: (ratingResult as any).insertId,
        ...body
      }
    }, { status: 201 });

  } catch (error) {
    await connection.rollback();
    console.error('Failed to create rating:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// GET all ratings or by id_subject
export async function GET(request: Request) {
  const pool = initDB();
  const { searchParams } = new URL(request.url);
  const check_id_job = searchParams.get('check_id_job');
  const check_id_user = searchParams.get('check_id_user');
  const check_id_subject = searchParams.get('check_id_subject');

  try {
    if (check_id_job && check_id_user && check_id_subject) {
      console.log('Checking rating with params:', {
        check_id_job,
        check_id_user,
        check_id_subject
      });

      const [existingRating] = await pool.query(
        `SELECT id_rating, value, feedback 
         FROM ratings 
         WHERE id_job = ? 
         AND id_user = ? 
         AND id_subject = ?`,
        [check_id_job, check_id_user, check_id_subject]
      );
      
      const rating = (existingRating as any[])[0];
      console.log('Found rating:', rating);

      return NextResponse.json({ 
        exists: rating ? true : false,
        rating: rating || null
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    return NextResponse.json({ 
      exists: false, 
      rating: null 
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// DELETE rating
export async function DELETE(request: Request) {
  const pool = initDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Rating ID is required' }, { status: 400 });
  }

  try {
    // Get the rating before deleting to update average
    const [rating] = await pool.query(
      'SELECT id_subject FROM ratings WHERE id_rating = ?',
      [id]
    );

    if ((rating as any[]).length === 0) {
      return NextResponse.json({ message: 'Rating not found' }, { status: 404 });
    }

    const id_subject = (rating as any[])[0].id_subject;

    // Delete the rating
    const [result] = await pool.query('DELETE FROM ratings WHERE id_rating = ?', [id]);
    
    // Update average rating
    const [avgRating] = await pool.query(
      'SELECT AVG(value) as avg_rating FROM ratings WHERE id_subject = ?',
      [id_subject]
    );
    
    await pool.query(
      'UPDATE profiles SET average_rating = ? WHERE id_profile = ?',
      [(avgRating as any[])[0]?.avg_rating || 0, id_subject]
    );

    return NextResponse.json({ message: 'Rating deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete rating:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Update OPTIONS to include new methods
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    },
  });
}

// UPDATE (PATCH)
export async function PATCH(request: Request) {
  const pool = initDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Rating ID is required' }, { status: 400 });
  }

  try {
    const ratingData: RatingData = await request.json();

    // Validate rating value
    if (ratingData.value < 1 || ratingData.value > 5) {
      return NextResponse.json({ 
        message: 'Rating value must be between 1 and 5' 
      }, { status: 400 });
    }

    // Validate feedback content
    if (ratingData.feedback) {
      if (ratingData.feedback.length > 1000) {
        return NextResponse.json({ 
          message: 'Feedback must be less than 1000 characters' 
        }, { status: 400 });
      }

      if (containsInappropriateContent(ratingData.feedback)) {
        return NextResponse.json({ 
          message: 'Feedback contains inappropriate content' 
        }, { status: 400 });
      }
    }

    // Check if rating exists and get current data
    const [existingRating] = await pool.query(
      'SELECT * FROM ratings WHERE id_rating = ?',
      [id]
    );

    if ((existingRating as any[]).length === 0) {
      return NextResponse.json({ message: 'Rating not found' }, { status: 404 });
    }

    // Update rating with feedback
    await pool.query(
      'UPDATE ratings SET value = ?, feedback = ? WHERE id_rating = ?',
      [ratingData.value, ratingData.feedback || null, id]
    );

    // Update average rating
    const id_subject = (existingRating as any[])[0].id_subject;
    const [avgRating] = await pool.query(
      'SELECT AVG(value) as avg_rating FROM ratings WHERE id_subject = ?',
      [id_subject]
    );
    
    await pool.query(
      'UPDATE profiles SET average_rating = ? WHERE id_profile = ?',
      [(avgRating as any[])[0].avg_rating, id_subject]
    );

    // Get updated rating
    const [updatedRating] = await pool.query(
      'SELECT * FROM ratings WHERE id_rating = ?',
      [id]
    );

    return NextResponse.json({ 
      message: 'Rating updated successfully',
      rating: (updatedRating as any[])[0]
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to update rating:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}