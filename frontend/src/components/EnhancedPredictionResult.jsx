import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, ShieldIcon } from "lucide-react";

const EnhancedPredictionResult = ({ prediction, disease }) => {
  const probability = prediction.probability || 0;
  const confidence = prediction.confidence || 'Low';
  const explanation = prediction.explanation || '';
  const precautions = prediction.precautions || [];
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
      <CardHeader className={`disease-card-header confidence-${confidence.toLowerCase()}`}>
        <CardTitle className="disease-name">
          {disease.replace(/_/g, ' ')}
        </CardTitle>
        <div className="badge-container">
          <Badge variant={
          confidence === 'High' ? 'destructive' :
          confidence === 'Medium' ? 'warning' : 'secondary'
          }>
            {confidence} confidence
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
              style={{width: `${probability * 100}%`}}
            ></div>
            <span>{(probability * 100).toFixed(2)}%</span>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="explanation">
          <h4>AI Explanation</h4>
          <p>{explanation}</p>
        </div>
        
        {precautions.length > 0 && (
          <div className="precautions mt-4">
            <h4>Recommended Precautions</h4>
            <ul className="precautions-list">
              {precautions.map((precaution, index) => (
                <li key={index}>
                  <CheckCircleIcon className="precaution-icon" />
                  <span>{precaution}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPredictionResult;

