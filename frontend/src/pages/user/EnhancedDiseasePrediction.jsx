import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import diagnosticService from '../../services/diagnosticService';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import RealtimeReasoning from '../../components/RealtimeReasoning';
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scroll-area";
import { 
  InfoIcon, 
  AlertCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  SearchIcon, 
  ClipboardIcon, 
  StethoscopeIcon, 
  LoaderIcon, 
  AlertTriangleIcon,
  BrainIcon,
  HelpCircleIcon,
  ShieldIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";


// Import the new components
import EnhancedPredictionResult from '../../components/EnhancedPredictionResult';
import ClarifyingQuestions from '../../components/ClarifyingQuestions';

// Import custom CSS
import '../../styles/disease_predictor.css';
import '../../styles/enhanced_predictor.css'; // Create this new CSS file for enhanced styles

const EnhancedDiseasePrediction = () => {
  const [symptomCategories, setSymptomCategories] = useState({});
  const [availableSymptoms, setAvailableSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSymptoms, setFetchingSymptoms] = useState(true);
  const [initialPredictions, setInitialPredictions] = useState(null);
  const [enhancedPredictions, setEnhancedPredictions] = useState(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState([]);
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
  const [error, setError] = useState(null);
  const [resultId, setResultId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [predictionComplete, setPredictionComplete] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [showRealtimeReasoning, setShowRealtimeReasoning] = useState(false);
  const [realtimeReasoningSteps, setRealtimeReasoningSteps] = useState([]);


  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        setFetchingSymptoms(true);
        const data = await diagnosticService.getSymptomCategories();
        
        // Make sure we have valid data before setting state
        if (data && data.symptom_categories) {
          setSymptomCategories(data.symptom_categories);
        } else {
          setSymptomCategories({});
          console.error('Invalid symptom categories data:', data);
        }
        
        if (data && data.available_symptoms) {
          setAvailableSymptoms(data.available_symptoms);
        } else {
          setAvailableSymptoms([]);
          console.error('Invalid available symptoms data:', data);
        }
      } catch (error) {
        setError('Failed to load symptoms. Please try again later.');
        console.error('Error fetching symptoms:', error);
        // Initialize with empty values to prevent mapping errors
        setSymptomCategories({});
        setAvailableSymptoms([]);
      } finally {
        setFetchingSymptoms(false);
      }
    };
    
    fetchSymptoms();
  }, []);

  const handleSymptomToggle = (symptom) => {
    setSelectedSymptoms(prev => {
      if (prev.includes(symptom)) {
        return prev.filter(s => s !== symptom);
      } else {
        return [...prev, symptom];
      }
    });
  };

  const handleSubmit = async (event) => {
  event.preventDefault();
  
  if (selectedSymptoms.length === 0) {
    setError('Please select at least one symptom');
    return;
  }

  try {
    setLoading(true);
    setError(null);
    setInitialPredictions(null);
    setEnhancedPredictions(null);
    setClarifyingQuestions([]);
    
    // Generate session ID immediately and start reasoning display
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setShowRealtimeReasoning(true);
    setRealtimeReasoningSteps([]);
    
    console.log('Session ID set:', newSessionId);
    
    const result = await diagnosticService.predictDiseaseEnhanced(selectedSymptoms);
    
    if (result.error) {
      setError(result.error);
      setShowRealtimeReasoning(false);
    } else {
      // Update session ID if different from backend
      if (result.session_id && result.session_id !== newSessionId) {
        setSessionId(result.session_id);
        console.log('Session ID updated:', result.session_id);
      }
      
      // Set initial predictions
      if (result.initial_predictions) {
        setInitialPredictions(result.initial_predictions);
      }
      
      // Set initial reasoning steps if available
      if (result.reasoning_steps) {
        setRealtimeReasoningSteps(result.reasoning_steps);
      }
      
      // Handle enhanced predictions
      if (result.enhanced && result.enhanced_predictions) {
        setDiagnosticResult(result);
        setPredictionComplete(!result.clarifying_questions);
      }
      
      // Handle clarifying questions
      if (result.clarifying_questions && result.clarifying_questions.length > 0) {
        setClarifyingQuestions(result.clarifying_questions);
        setShowQuestionsDialog(true);
      }
      
      // Save result ID
      if (result.result_id) {
        setResultId(result.result_id);
      }
      
      if (!result.enhanced && result.enhancement_error) {
        setError(`Note: Enhanced analysis unavailable - ${result.enhancement_error}`);
      }
    }
  } catch (error) {
    setError(error.response?.data?.error || 'Error predicting disease');
    setShowRealtimeReasoning(false);
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};


const handleAnswerSubmit = async (answers) => {
  if (!sessionId && !resultId) {
    setError('Cannot submit answers: no session or result ID available.');
    return;
  }

  setIsAnsweringQuestions(true);
  setError(null);

  try {
    const result = await diagnosticService.answerClarifyingQuestions(
      resultId, 
      answers, 
      sessionId
    );

    if (result.error) {
      setError(result.error);
    } else {
      // Update predictions
      if (result.initial_predictions) {
        setInitialPredictions(result.initial_predictions);
      }

      if (result.enhanced_predictions) {
        setDiagnosticResult(result);
        setPredictionComplete(!result.clarifying_questions || result.prediction_complete);
      }

      // Update reasoning steps
      if (result.reasoning_steps) {
        setRealtimeReasoningSteps(prev => [...prev, ...result.reasoning_steps]);
      }

      // Handle more questions or completion
      if (result.clarifying_questions && result.clarifying_questions.length > 0) {
        setClarifyingQuestions(result.clarifying_questions);
        setShowQuestionsDialog(true);
      } else {
        setShowQuestionsDialog(false);
        if (result.enhanced_predictions) {
          setDiagnosticResult(result);
        }
        // Keep reasoning panel open until final results
      }

      // Update IDs
      if (result.result_id) {
        setResultId(result.result_id);
      }
      if (result.session_id) {
        setSessionId(result.session_id);
      }
    }
  } catch (error) {
    setError('An error occurred while processing your answers. Please try again.');
    console.error('Error:', error);
  } finally {
    setIsAnsweringQuestions(false);
  }
};

const handleReasoningStepsUpdate = (steps) => {
  setRealtimeReasoningSteps(steps);
};

  const handleReset = () => {
    setSelectedSymptoms([]);
    setInitialPredictions(null);
    setEnhancedPredictions(null);
    setClarifyingQuestions([]);
    setShowQuestionsDialog(false);
    setError(null);
    setResultId(null);
    setSessionId(null);
  };

  // Helper function to check if we have valid predictions
  const hasValidPredictions = () => {
    return (enhancedPredictions && Object.keys(enhancedPredictions).length > 0) || 
           (initialPredictions && Object.keys(initialPredictions).length > 0);
  };
  // Helper function to format step names
const formatStepName = (stepData) => {
  if (typeof stepData === 'object' && stepData.step) {
    const stepName = stepData.step;
    // Convert snake_case to Title Case
    return stepName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'Processing Step';
};

// Helper function to format medical analysis content
const formatMedicalAnalysis = (medicalAnalysis) => {
  if (!medicalAnalysis || typeof medicalAnalysis !== 'object') {
    return null;
  }

  const sections = [
    { key: 'symptom_analysis', title: 'Symptom Analysis' },
    { key: 'differential_diagnosis', title: 'Differential Diagnosis' },
    { key: 'missing_clinical_info', title: 'Missing Clinical Information' },
    { key: 'questioning_strategy', title: 'Questioning Strategy' },
    { key: 'medical_complexity', title: 'Medical Complexity' }
  ];

  return sections.map(section => {
    const content = medicalAnalysis[section.key];
    if (!content) return null;

    // Clean up the content - remove markdown formatting and extra asterisks
    const cleanContent = content
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/^\*+\s*/, '') // Remove leading asterisks
      .replace(/\n\*+\s*/g, '\n• ') // Convert bullet points
      .trim();

    return {
      title: section.title,
      content: cleanContent
    };
  }).filter(Boolean);
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return timestamp;
  }
};

const formatExplanationAnalysis = (explanationAnalysis) => {
  if (!explanationAnalysis || typeof explanationAnalysis !== 'object') {
    return null;
  }

  return Object.entries(explanationAnalysis).map(([disease, analysis]) => ({
    disease,
    symptomCorrelation: analysis.symptom_correlation || 'No correlation analysis available',
    confidenceReasoning: analysis.confidence_reasoning || 'No confidence reasoning available'
  }));
};

const filterReasoningStepsForDisplay = (steps) => {
  if (!steps || !Array.isArray(steps)) return [];
  
  const allowedSteps = [
    'initial_diagnostic_analysis',
    'processing_user_responses', 
    'generating_patient_explanations'
  ];
  
  return steps.filter(step => {
    const stepData = typeof step === 'string' ? JSON.parse(step) : step;
    return allowedSteps.includes(stepData.step);
  });
};
  return (
    <div className="enhanced-disease-predictor-page">
      <Header activePath="/enhanced-disease-prediction" />
      
      <div className="enhanced-disease-predictor-container">
        <div className="ai-page-header">
          <div className="ai-header-background">
            <div className="neural-network-bg"></div>
            <div className="gradient-orbs">
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
            </div>
          </div>
          <div className="ai-header-content">
            <div className="ai-logo-section">
              <div className="ai-brain-icon">
                <BrainIcon className="brain-icon" />
                <div className="brain-pulse"></div>
              </div>
              <div className="ai-badge">
                <span className="ai-badge-text">AI-POWERED</span>
              </div>
            </div>
            <h1 className="ai-title">
              <span className="title-gradient">Enhanced Disease Prediction</span>
              <span className="ai-subtitle">Advanced Multi-Agent Analysis</span>
            </h1>
            <p className="ai-description">
              Leveraging cutting-edge AI technology for transparent, explainable medical insights
            </p>

            <div className="ai-info-card">
              <div className="info-card-icon">
                <InfoIcon className="info-icon" />
                <div className="info-icon-glow"></div>
              </div>
              <div className="info-card-content">
                <h3 className="info-card-title">How it works</h3>
                <p className="info-card-description">
                  This enhanced predictor uses advanced AI to analyze your symptoms, provide detailed explanations,
                  and ask follow-up questions to improve the accuracy of your diagnosis.
                </p>
              </div>
            </div>
            <div className="steps-container">
            <div className="step-item">
              <div className="step-icon">
                <div className="step-number">1</div>
                <div className="step-glow"></div>
              </div>
              <div className="step-content">
                <h3>Submit Symptoms</h3>
                <p>Select your symptoms from our comprehensive database</p>
              </div>
              <div className="step-connector"></div>
            </div>
            
            <div className="step-item">
              <div className="step-icon">
                <div className="step-number">2</div>
                <div className="step-glow"></div>
              </div>
              <div className="step-content">
                <h3>AI Analysis</h3>
                <p>Multi-agent system analyzes and asks clarifying questions</p>
              </div>
              <div className="step-connector"></div>
            </div>
            
            <div className="step-item">
              <div className="step-icon">
                <div className="step-number">3</div>
                <div className="step-glow"></div>
              </div>
              <div className="step-content">
                <h3>Enhanced Results</h3>
                <p>Get detailed predictions with transparent explanations</p>
              </div>
            </div>
          </div>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="error-alert">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="diagnostic-workspace">
        <div className="main-content">
        <form onSubmit={handleSubmit} className="predictor-form">
          <Card className="symptoms-card ai-enhanced-card">
            <CardHeader className="symptoms-card-header">
              <div className="symptoms-header-background">
                <div className="symptoms-neural-bg"></div>
                <div className="symptoms-gradient-orbs">
                  <div className="symptoms-orb symptoms-orb-1"></div>
                  <div className="symptoms-orb symptoms-orb-2"></div>
                </div>
              </div>
              <div className="symptoms-header-content">
                <div className="symptoms-icon-section">
                  <div className="symptoms-brain-icon">
                    <StethoscopeIcon className="stethoscope-icon" />
                    <div className="symptoms-pulse"></div>
                  </div>
                </div>
                <CardTitle className="symptoms-title">
                  <span className="symptoms-title-gradient">Select Your Symptoms</span>
                </CardTitle>
                <CardDescription className="symptoms-description">
                  Browse through categories and check all symptoms you're experiencing
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="symptoms-content">
              {fetchingSymptoms ? (
                <div className="loading-container">
                  <LoaderIcon className="animate-spin" />
                  <p>Loading symptoms...</p>
                </div>
              ) : !symptomCategories || Object.keys(symptomCategories).length === 0 ? (
                <Alert>
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertTitle>No symptoms available</AlertTitle>
                  <AlertDescription>
                    Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="symptoms-categories-container">
                  {Object.entries(symptomCategories).map(([category, symptoms], index) => (
                    <div key={category} className="symptom-category-section">
                      <div className="category-header">
                        <h3 className="category-title">{category}</h3>
                        <div className="category-divider"></div>
                      </div>
                      <div className="symptoms-grid">
                        {Array.isArray(symptoms) ? symptoms.map(symptom => (
                          <div className="symptom-item" key={symptom}>
                            <div className="symptom-checkbox">
                              <Checkbox
                                id={`symptom-${symptom}`}
                                checked={selectedSymptoms.includes(symptom)}
                                onCheckedChange={() => handleSymptomToggle(symptom)}
                              />
                              <Label
                                htmlFor={`symptom-${symptom}`}
                                className="symptom-label"
                              >
                                {symptom.replace(/_/g, ' ')}
                              </Label>
                            </div>
                          </div>
                        )) : (
                          <p className="no-symptoms">No symptoms in this category</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="selected-symptoms-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardIcon className="mr-2 h-5 w-5" />
                Selected Symptoms ({selectedSymptoms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSymptoms.length > 0 ? (
                <div className="selected-symptoms-list">
                  {selectedSymptoms.map(symptom => (
                    <Badge variant="outline" key={symptom} className="symptom-badge">
                      {symptom.replace(/_/g, ' ')}
                      <button 
                        type="button" 
                        onClick={() => handleSymptomToggle(symptom)}
                        className="remove-symptom"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                  <p className="no-selected-symptoms">
                  No symptoms selected yet. Please select symptoms from the categories above.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="predict-button"
                disabled={selectedSymptoms.length === 0 || loading}
              >
                {loading ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <BrainIcon className="mr-2 h-4 w-4" />
                    Get AI-Enhanced Diagnosis
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                onClick={handleReset}
                className="reset-button ml-2"
              >
                <XCircleIcon className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </CardFooter>
          </Card>
          
          {hasValidPredictions() && (predictionComplete || !showQuestionsDialog) && (
            <div className="prediction-results">
              <div className="results-header">
                <h2>
                  <CheckCircleIcon className="mr-2 h-5 w-5" />
                  AI Diagnostic Results
                </h2>
                <Badge className="results-count">
                  {Object.keys(enhancedPredictions || initialPredictions).length} possible condition{Object.keys(enhancedPredictions || initialPredictions).length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {diagnosticResult && diagnosticResult.enhanced && diagnosticResult.enhanced_predictions ? (
                <div className="enhanced-results-grid">
                  {Object.entries(diagnosticResult.enhanced_predictions)
                  .sort(([, a], [, b]) => b.probability - a.probability)
                  .map(([disease, prediction]) => (
                      <EnhancedPredictionResult
                        key={disease}
                        disease={disease}
                        prediction={prediction}
                      />
                    ))
                  }
                </div>
              ) : initialPredictions && Object.keys(initialPredictions).length > 0 ? (
                <>
                  <Alert className="mb-4">
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Basic Results Only</AlertTitle>
                    <AlertDescription>
                      Enhanced AI analysis is not available. Showing basic prediction results.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="results-grid">
                    {Object.entries(initialPredictions)
                      .sort(([, a], [, b]) => b.probability - a.probability)
                      .map(([disease, details]) => (
                        <Card key={disease} className="disease-card">
                          <CardHeader className={`disease-card-header confidence-${details.confidence?.toLowerCase() || 'low'}`}>
                            <CardTitle className="disease-name">
                              {disease.replace(/_/g, ' ')}
                            </CardTitle>
                            <Badge variant={details.confidence === 'High' ? 'destructive' :
                                          details.confidence === 'Medium' ? 'warning' : 'secondary'}>
                              {details.confidence || 'Low'} confidence
                            </Badge>
                          </CardHeader>
                          <CardContent className="disease-details">
                            <div className="probability">
                              <label>Probability:</label>
                              <div className="probability-bar">
                                <div
                                  className="probability-fill"
                                  style={{width: `${details.probability * 100}%`}}
                                ></div>
                                <span>{(details.probability * 100).toFixed(2)}%</span>
                              </div>
                            </div>
                            
                            <Separator className="my-4" />
                            
                            <Tabs defaultValue="description" className="disease-tabs">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="description">Description</TabsTrigger>
                                <TabsTrigger value="precautions">Precautions</TabsTrigger>
                              </TabsList>
                              <TabsContent value="description" className="disease-description">
                                <ScrollArea className="h-[120px]">
                                  <p>{details.description || "No description available"}</p>
                                </ScrollArea>
                              </TabsContent>
                              <TabsContent value="precautions">
                                <ScrollArea className="h-[120px]">
                                  {Array.isArray(details.precautions) && details.precautions.length > 0 ? (
                                    <ul className="precautions-list">
                                      {details.precautions.map((precaution, index) => (
                                        <li key={index}>
                                          <CheckCircleIcon className="precaution-icon" />
                                          <span>{precaution}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="no-precautions">No specific precautions available</p>
                                  )}
                                </ScrollArea>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      ))
                    }
                  </div>
                </>
              ) : (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>No specific diseases predicted</AlertTitle>
                  <AlertDescription>
                    Try selecting more specific symptoms or consult a healthcare professional.
                  </AlertDescription>
                </Alert>
              )}
              
              {hasValidPredictions() && diagnosticResult?.reasoning_steps?.length > 0 && (
              <Card className="reasoning-steps-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BrainIcon className="mr-2 h-5 w-5" />
                    AI Reasoning Process
                  </CardTitle>
                  <CardDescription>
                    Step-by-step explanation of how the AI reached its conclusions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {filterReasoningStepsForDisplay(diagnosticResult.reasoning_steps).map((step, index) => {
                      const stepData = typeof step === 'string' ? JSON.parse(step) : step;
                      const stepName = formatStepName(stepData);
                      const timestamp = formatTimestamp(stepData.timestamp);
                      
                      return (
                        <AccordionItem key={index} value={`step-${index}`}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <div className="step-number mr-3">{index + 1}</div>
                                <span className="step-title font-medium">{stepName}</span>
                              </div>
                              {timestamp && (
                                <span className="text-sm text-gray-500 ml-2">{timestamp}</span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="reasoning-step-detail">
                              {stepData.step === 'initial_diagnostic_analysis' && stepData.medical_analysis ? (
                                <div className="medical-analysis-content">
                                  {formatMedicalAnalysis(stepData.medical_analysis)?.map((section, sectionIndex) => (
                                    <div key={sectionIndex} className="analysis-section mb-4">
                                      <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                        {section.title}
                                      </h4>
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {section.content.split('\n').map((paragraph, pIndex) => (
                                          paragraph.trim() && (
                                            <p key={pIndex} className="mb-2">
                                              {paragraph.trim()}
                                            </p>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : stepData.step === 'processing_user_responses' && stepData.processing_result?.medical_reasoning ? (
                                <div className="medical-reasoning-content">
                                  <div className="analysis-section">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                      Medical Reasoning
                                    </h4>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                      {stepData.processing_result.medical_reasoning.split('\n').map((paragraph, pIndex) => (
                                        paragraph.trim() && (
                                          <p key={pIndex} className="mb-2">
                                            {paragraph.trim()}
                                          </p>
                                        )
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : stepData.step === 'generating_patient_explanations' && stepData.explanation_analysis ? (
                                <div className="explanation-analysis-content">
                                  <div className="analysis-section">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                      Disease Explanation Analysis
                                    </h4>
                                    <div className="space-y-4">
                                      {formatExplanationAnalysis(stepData.explanation_analysis)?.map((diseaseAnalysis, diseaseIndex) => (
                                        <div key={diseaseIndex} className="disease-explanation-item border-l-4 border-blue-200 pl-4 py-2">
                                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                                            {diseaseAnalysis.disease}
                                          </h5>
                                          <div className="space-y-2">
                                            <div>
                                              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                Symptom Correlation:
                                              </span>
                                              <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                                {diseaseAnalysis.symptomCorrelation}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                Confidence Reasoning:
                                              </span>
                                              <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                                {diseaseAnalysis.confidenceReasoning}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                // This fallback should not appear with filtering, but kept for safety
                                <div className="generic-step-content">
                                  <p className="text-sm text-gray-500 italic">
                                    Step details not available for display
                                  </p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                  {/* Show count of filtered vs total steps for debugging info */}
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    Showing {filterReasoningStepsForDisplay(diagnosticResult.reasoning_steps).length} of {diagnosticResult.reasoning_steps.length} reasoning steps
                  </div>
                </CardContent>
              </Card>
            )}

              <Alert className="disclaimer-alert">
                <ShieldIcon className="h-4 w-4" />
                <AlertTitle>Important Disclaimer</AlertTitle>
                <AlertDescription>
                  This AI-enhanced prediction is based on the symptoms you provided and should not be considered as a definitive diagnosis.
                  Please consult a healthcare professional for proper diagnosis and treatment.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </form>
      </div>
      </div>
       {/* Real-time Reasoning Panel */}
    {showRealtimeReasoning && (
      <div className="reasoning-sidebar">
        <RealtimeReasoning
          isActive={showRealtimeReasoning}
          sessionId={sessionId}
          initialSteps={realtimeReasoningSteps}
          onStepsUpdate={handleReasoningStepsUpdate}
          shouldConnect={true}
        />
      </div>
    )}
    </div>
      <Footer />

      {/* Clarifying Questions Dialog */}
          <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <HelpCircleIcon className="mr-2 h-5 w-5" />
                  Follow-up Questions
                </DialogTitle>
                <DialogDescription>
                  Please answer these additional questions to improve the accuracy of your diagnosis
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <ClarifyingQuestions
                  questions={clarifyingQuestions}
                  onSubmit={handleAnswerSubmit}
                  isLoading={isAnsweringQuestions}
                />
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
};

export default EnhancedDiseasePrediction;

