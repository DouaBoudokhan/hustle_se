import OpenAI from "openai";
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.GROK_AI_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

export async function POST(request: Request) {
  try {
    const { jobDescription, title, category } = await request.json();

    const prompt = `Generate 5 interview questions for this ${category} position: ${title}.
                   Job Description: ${jobDescription}
                   Return the response in this exact JSON format:
                   [
                     {
                       "question": "question text here",
                       "type": "technical or behavioral",
                       "purpose": "purpose here",
                       "ideal_answer_points": ["point 1", "point 2", "point 3"]
                     }
                   ]`;

    const completion = await openai.chat.completions.create({
      model: "grok-beta",
      messages: [
        { 
          role: "system", 
          content: "You are an expert interviewer. Respond only with valid JSON." 
        },
        {
          role: "user",
          content: prompt
        },
      ],
    });

    try {
      const content = completion.choices[0].message.content || '[]';
      // Remove any markdown formatting that might be present
      const cleanContent = content.replace(/```json\n|\n```/g, '').trim();
      const questions = JSON.parse(cleanContent);
      
      return NextResponse.json({
        questions,
        jobTitle: title,
        category: category
      });
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error) {
    console.error('Interview questions generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview questions' },
      { status: 500 }
    );
  }
} 