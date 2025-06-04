import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import diagnosticService from '../../services/diagnosticService';

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scroll-area";

// Import icons
import { 
  InfoIcon, 
  AlertCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  SearchIcon, 
  ClipboardIcon, 
  StethoscopeIcon, 
  LoaderIcon, 
  AlertTriangleIcon 
} from "lucide-react";


// Import custom CSS
import '../../styles/disease_predictor.css';

const DiseasePredictor = () => {
  const [symptomCategories, setSymptomCategories] = useState({});
  const [availableSymptoms, setAvailableSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSymptoms, setFetchingSymptoms] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
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
      
      const result = await diagnosticService.predictDisease(selectedSymptoms);
      
      if (result.error) {
        setError(result.error);
        setResult(null);
      } else {
        // Filter out metadata fields that aren't disease predictions
        const filteredResult = { ...result };
        // Remove known metadata fields
        delete filteredResult.saved;
        delete filteredResult.result_id;
        
        // Additional filtering: only keep entries that have valid disease data
        const validDiseaseResult = Object.entries(filteredResult).reduce((acc, [disease, details]) => {
          // Check if this is a valid disease prediction entry
          if (details && 
              typeof details === 'object' &&
              'probability' in details &&
              'confidence' in details &&
              !isNaN(details.probability)) {
            acc[disease] = details;
          }
          return acc;
        }, {});
        
        setResult(validDiseaseResult);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error predicting disease');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if we have valid disease predictions
  const hasValidPredictions = () => {
    return result &&
           typeof result === 'object' &&
           Object.keys(result).length > 0;
  };

  const getConfidenceBadgeColor = (confidence) => {
    switch(confidence) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="disease-predictor-page">
      <Header activePath="/disease-prediction" />
      
      <div className="disease-predictor-container">
        <div className="page-header">
          <h1>
            <StethoscopeIcon className="icon" />
            Disease Prediction
          </h1>
          <p>Select your symptoms to get a prediction of possible conditions</p>
        </div>
        
        <div className="info-card">
          <InfoIcon className="info-icon" />
          <div>
            <h3>How it works</h3>
            <p>
              Select all the symptoms you are experiencing to get a prediction of possible diseases.
              The more symptoms you provide, the more accurate the prediction will be.
            </p>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="error-alert">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="predictor-form">
          <Card className="symptoms-card">
            <CardHeader>
              <CardTitle>Select Your Symptoms</CardTitle>
              <CardDescription>
                Browse through categories and check all symptoms you're experiencing
              </CardDescription>
            </CardHeader>
            
            <CardContent>
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
                <Accordion type="multiple" className="symptoms-accordion">
                  {Object.entries(symptomCategories).map(([category, symptoms], index) => (
                    <AccordionItem value={`item-${index}`} key={category}>
                      <AccordionTrigger className="category-trigger">
                        {category}
                      </AccordionTrigger>
                      <AccordionContent>
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
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
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
                    Analyzing Symptoms...
                  </>
                ) : (
                  <>
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Predict Possible Diseases
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {hasValidPredictions() && (
            <div className="prediction-results">
              <div className="results-header">
                <h2>
                  <CheckCircleIcon className="mr-2 h-5 w-5" />
                  Prediction Results
                </h2>
                <Badge className="results-count">
                  {Object.keys(result).length} possible condition{Object.keys(result).length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {Object.keys(result).length === 0 ? (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>No specific diseases predicted</AlertTitle>
                  <AlertDescription>
                    Try selecting more specific symptoms or consult a healthcare professional.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="results-grid">
                  {Object.entries(result).map(([disease, details]) => (
                    <Card key={disease} className="disease-card">
                      <CardHeader className={`disease-card-header confidence-${details.confidence.toLowerCase()}`}>
                        <CardTitle className="disease-name">
                          {disease.replace(/_/g, ' ')}
                        </CardTitle>
                        <Badge variant={getConfidenceBadgeColor(details.confidence)}>
                          {details.confidence} confidence
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
                  ))}
                </div>
              )}
              
              <Alert className="disclaimer-alert">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Important Disclaimer</AlertTitle>
                <AlertDescription>
                  This prediction is based on the symptoms you provided and should not be considered as a definitive diagnosis.
                  Please consult a healthcare professional for proper diagnosis and treatment.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </form>
      </div>
      
      <Footer />
    </div>
  );
};

export default DiseasePredictor;
