import React, { useState } from 'react';
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { LoaderIcon, SendIcon } from "lucide-react";

const ClarifyingQuestions = ({ questions, onSubmit, isLoading }) => {
  const [answers, setAnswers] = useState({});

  // Add debugging and data normalization
  const normalizeQuestions = (rawQuestions) => {
    if (!Array.isArray(rawQuestions)) {
      console.warn('Questions is not an array:', rawQuestions);
      return [];
    }

    return rawQuestions.map((question, index) => {
      // Handle case where question might be a string or improperly formatted
      let normalizedQuestion;
      
      if (typeof question === 'string') {
        // If question is a string, create a basic question object
        normalizedQuestion = {
          id: `q${index + 1}`,
          question: question,
          question_text: question,
          type: 'yes_no',
          required: true
        };
      } else if (typeof question === 'object' && question !== null) {
        // Normalize the question object
        normalizedQuestion = {
          id: question.id || `q${index + 1}`,
          question: question.question_text || question.question || 'Question text not available',
          question_text: question.question_text || question.question || 'Question text not available',
          type: question.type || 'yes_no',
          related_disease: question.related_disease || '',
          symptom_checking: question.symptom_checking || '',
          priority: question.priority || 1,
          required: question.required !== undefined ? question.required : true,
          description: question.description || '',
          options: question.options || []
        };
      } else {
        // Fallback for invalid question data
        normalizedQuestion = {
          id: `q${index + 1}`,
          question: 'Question text not available',
          question_text: 'Question text not available',
          type: 'yes_no',
          required: true
        };
      }

      console.log(`Normalized question ${index + 1}:`, normalizedQuestion);
      return normalizedQuestion;
    });
  };

  const normalizedQuestions = normalizeQuestions(questions);

  const handleRadioChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId, value, isChecked) => {
    setAnswers(prev => {
      const currentValues = prev[questionId] || [];
      
      if (isChecked) {
        return {
          ...prev,
          [questionId]: [...currentValues, value]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentValues.filter(v => v !== value)
        };
      }
    });
  };

  const handleTextChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = (e) => {
    console.log('Form submit triggered');
    e.preventDefault();
    
    const formattedAnswers = {};
    
    normalizedQuestions.forEach((question) => {
      const answer = answers[question.id];
      
      if (answer !== undefined && answer !== null && answer !== '') {
        // Use question ID as key instead of index
        formattedAnswers[question.id] = answer;
      }
    });
    
    console.log('Submitting formatted answers:', formattedAnswers);
    onSubmit(formattedAnswers);
  };

  const renderQuestion = (question) => {
    console.log('Rendering question:', question);
    
    const questionType = question.type || 'yes_no';
    
    switch (questionType) {
      case 'multiple_choice':
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleRadioChange(question.id, value)}
            className="space-y-2"
          >
            {(question.options || []).map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2">
            {(question.options || []).map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option.value}`}
                  checked={(answers[question.id] || []).includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(question.id, option.value, checked)
                  }
                />
                <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );
        
      case 'text':
        return (
          <Textarea
            id={question.id}
            value={answers[question.id] || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            placeholder={question.placeholder || 'Enter your answer...'}
            className="min-h-[100px]"
          />
        );
        
      case 'yes_no':
      default:
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleRadioChange(question.id, value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
              <Label htmlFor={`${question.id}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${question.id}-no`} />
              <Label htmlFor={`${question.id}-no`}>No</Label>
            </div>
          </RadioGroup>
        );
    }
  };

  // Add validation for empty questions
  if (!normalizedQuestions || normalizedQuestions.length === 0) {
    return (
      <div className="clarifying-questions-form">
        <p className="text-muted-foreground">No questions available at this time.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="clarifying-questions-form">
      <div className="questions-list space-y-6">
        {normalizedQuestions.map((question) => (
          <div key={question.id} className="question-item">
            <Label className="question-label mb-2 block font-medium">
              {question.question_text || question.question || 'Question text not available'}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="question-description text-sm text-muted-foreground mb-2">
                {question.description}
              </p>
            )}
            {renderQuestion(question)}
          </div>
        ))}
      </div>
      
      <div className="submit-answers mt-4">
        <Button 
          type="submit"
          disabled={isLoading || Object.keys(answers).length === 0}
          className="submit-button"
        >
          {isLoading ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <SendIcon className="mr-2 h-4 w-4" />
              Submit Answers
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ClarifyingQuestions;
