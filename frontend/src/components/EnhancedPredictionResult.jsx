import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, ShieldIcon } from "lucide-react";

const EnhancedPredictionResult = ({ prediction, disease }) => {
  if (!prediction) return null;

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
    <Card className="disease-card enhanced">
      <CardHeader className={`disease-card-header confidence-${prediction.confidence_level?.toLowerCase() || 'low'}`}>
        <CardTitle className="disease-name">
          {disease.replace(/_/g, ' ')}
        </CardTitle>
        <div className="badge-container">
          <Badge variant={getConfidenceBadgeColor(prediction.confidence_level || 'Low')}>
            {prediction.confidence_level || 'Low'} confidence
          </Badge>
          {prediction.symptom_match && (
            <Badge variant="outline" className="symptom-match-badge">
              {prediction.symptom_match}% symptom match
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="disease-details">
        <div className="probability">
          <label>Probability:</label>
          <div className="probability-bar">
            <div
              className="probability-fill"
              style={{width: `${prediction.probability * 100}%`}}
            ></div>
            <span>{(prediction.probability * 100).toFixed(2)}%</span>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <Tabs defaultValue="explanation" className="disease-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="explanation">Explanation</TabsTrigger>
            <TabsTrigger value="description">Description</TabsTrigger>
                        <TabsTrigger value="precautions">Precautions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="explanation" className="disease-explanation">
            <ScrollArea className="h-[150px]">
              {prediction.explanation ? (
                <div className="explanation-content">
                  <p>{prediction.explanation}</p>
                  
                  {prediction.matching_symptoms && prediction.matching_symptoms.length > 0 && (
                    <div className="matching-symptoms mt-2">
                      <h4 className="text-sm font-medium">Matching Symptoms:</h4>
                      <ul className="list-disc pl-5 text-sm">
                        {prediction.matching_symptoms.map((symptom, index) => (
                          <li key={index}>{symptom.replace(/_/g, ' ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {prediction.missing_symptoms && prediction.missing_symptoms.length > 0 && (
                    <div className="missing-symptoms mt-2">
                      <h4 className="text-sm font-medium">Typically Also Present:</h4>
                      <ul className="list-disc pl-5 text-sm">
                        {prediction.missing_symptoms.map((symptom, index) => (
                          <li key={index}>{symptom.replace(/_/g, ' ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="no-explanation">No detailed explanation available</p>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="description" className="disease-description">
            <ScrollArea className="h-[150px]">
              <p>{prediction.description || "No description available"}</p>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="precautions" className="disease-precautions">
            <ScrollArea className="h-[150px]">
              {Array.isArray(prediction.precautions) && prediction.precautions.length > 0 ? (
                <ul className="precautions-list">
                  {prediction.precautions.map((precaution, index) => (
                    <li key={index} className="flex items-start gap-2 mb-2">
                      <CheckCircleIcon className="precaution-icon h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
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
        
        {prediction.severity && (
          <div className="severity-info mt-4">
            <h4 className="text-sm font-medium">Severity Level:</h4>
            <div className={`severity-indicator severity-${prediction.severity.toLowerCase()}`}>
              <span className="severity-label">{prediction.severity}</span>
              <div className="severity-bar">
                <div 
                  className="severity-fill" 
                  style={{
                    width: prediction.severity === 'High' ? '100%' : 
                           prediction.severity === 'Medium' ? '66%' : '33%'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        {prediction.recommendation && (
          <Alert className="recommendation-alert mt-4">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Recommendation</AlertTitle>
            <AlertDescription>
              {prediction.recommendation}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPredictionResult;

