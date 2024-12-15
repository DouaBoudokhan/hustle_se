import jsPDF from 'jspdf';

interface Question {
  question: string;
  type: string;
  purpose: string;
  ideal_answer_points: string[];
}

export const generateInterviewPDF = (
  questions: Question[],
  jobTitle: string,
  category: string
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(`Interview Questions: ${jobTitle}`, 20, 20);
  doc.setFontSize(14);
  doc.text(`Category: ${category}`, 20, 30);
  
  let yPosition = 50;
  
  // Add questions
  questions.forEach((q, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.text(`Q${index + 1}: ${q.question}`, 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.text(`Type: ${q.type}`, 25, yPosition);
    yPosition += 10;
    
    doc.text(`Purpose: ${q.purpose}`, 25, yPosition);
    yPosition += 10;
    
    doc.text('Ideal Answer Points:', 25, yPosition);
    yPosition += 5;
    
    q.ideal_answer_points.forEach(point => {
      doc.text(`• ${point}`, 30, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
  });
  
  // Save PDF
  doc.save(`interview_questions_${jobTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}; 