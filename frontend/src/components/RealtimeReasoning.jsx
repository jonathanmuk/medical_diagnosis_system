import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { BrainIcon, LoaderIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";

const RealtimeReasoning = ({ 
  isActive, 
  sessionId, 
  initialSteps = [], 
  onStepsUpdate,
  shouldConnect = false 
}) => {
  const [reasoningSteps, setReasoningSteps] = useState(initialSteps);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [pendingSessionId, setPendingSessionId] = useState(null);
  const scrollAreaRef = useRef(null);
  const eventSourceRef = useRef(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 10;

  useEffect(() => {
    if (isActive && (sessionId || shouldConnect)) {
      if (sessionId) {
        connectToReasoningStream(sessionId);
      } else if (shouldConnect && !sessionId) {
        // Wait for sessionId with polling
        pollForSessionId();
      }
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isActive, sessionId, shouldConnect]);


   // ADDED: Poll for sessionId when we need to connect early
  const pollForSessionId = () => {
    const pollInterval = setInterval(() => {
      connectionAttempts.current++;
      
      if (sessionId) {
        clearInterval(pollInterval);
        connectToReasoningStream(sessionId);
      } else if (connectionAttempts.current >= maxConnectionAttempts) {
        clearInterval(pollInterval);
        console.warn('Max connection attempts reached waiting for sessionId');
      }
    }, 500); // Poll every 500ms
  };

  useEffect(() => {
    // Auto-scroll to bottom when new steps are added
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [reasoningSteps]);

  const connectToReasoningStream = (targetSessionId) => {
    if (!targetSessionId) return;
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      console.log(`Connecting to reasoning stream for session: ${targetSessionId}`);
      const eventSource = new EventSource(`http://localhost:8000/api/diagnostics/reasoning-stream/${targetSessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        connectionAttempts.current = 0;
        console.log('Connected to reasoning stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleReasoningUpdate(data);
        } catch (error) {
          console.error('Error parsing reasoning update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, connectionAttempts.current), 10000);
        setTimeout(() => {
          if (isActive && eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectionAttempts.current++;
            if (connectionAttempts.current < maxConnectionAttempts) {
              connectToReasoningStream(targetSessionId);
            }
          }
        }, backoffDelay);
      };
    } catch (error) {
      console.error('Error connecting to reasoning stream:', error);
      setIsConnected(false);
    }
  };

  const handleReasoningUpdate = (data) => {
  console.log('Received reasoning update:', data);
      
  if (data.type === 'step') {
    const newStep = {
      id: data.step_id || Date.now(),
      agent: data.agent,
      step: data.step,
      timestamp: data.timestamp || new Date().toISOString(),
      content: data.content,
      status: data.status || 'completed',
      details: data.details
    };
    
    setReasoningSteps(prev => {
      const updated = [...prev, newStep];
      // Use setTimeout to defer the parent update to avoid setState during render
      if (onStepsUpdate) {
        setTimeout(() => {
          onStepsUpdate(updated);
        }, 0);
      }
      return updated;
    });
    
    if (data.status === 'in_progress') {
      setCurrentStep(newStep);
    } else {
      setCurrentStep(null);
    }
  } else if (data.type === 'current_step') {
    setCurrentStep(data.step);
  } else if (data.type === 'complete') {
    setCurrentStep(null);
    setIsConnected(false);
  } else if (data.type === 'connected') {
    console.log('SSE connection confirmed');
  }
};

  const getStepIcon = (step) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <LoaderIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <BrainIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAgentBadgeColor = (agent) => {
    const colors = {
      'system': 'bg-gray-100 text-gray-800',
      'ml_model': 'bg-blue-100 text-blue-800',
      'orchestrator': 'bg-purple-100 text-purple-800',
      'questioning': 'bg-blue-100 text-blue-800',
      'response_integration': 'bg-green-100 text-green-800',
      'refinement': 'bg-orange-100 text-orange-800',
      'validation': 'bg-red-100 text-red-800',
      'evaluator': 'bg-indigo-100 text-indigo-800',
      'explanation': 'bg-pink-100 text-pink-800'
    };
    return colors[agent] || 'bg-gray-100 text-gray-800';
  };

  const formatStepContent = (step) => {
    if (typeof step.content === 'string') {
      return step.content;
    } else if (typeof step.content === 'object') {
      return JSON.stringify(step.content, null, 2);
    }
    return 'Processing...';
  };

  if (!isActive) {
    return null;
  }

  return (
    <Card className="realtime-reasoning-card sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <BrainIcon className="mr-2 h-5 w-5" />
            AI Reasoning Process
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            {!sessionId && shouldConnect && (
              <span className="text-xs text-yellow-600">Waiting for session...</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full" ref={scrollAreaRef}>
          <div className="space-y-4">
            {reasoningSteps.length === 0 && shouldConnect && (
              <div className="text-center text-gray-500 py-8">
                <LoaderIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Initializing diagnostic reasoning...</p>
              </div>
            )}
            
            {reasoningSteps.map((step, index) => (
              <div key={step.id || index} className="reasoning-step">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={`text-xs ${getAgentBadgeColor(step.agent)}`}>
                        {step.agent}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {step.step?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {formatStepContent(step)}
                    </div>
                    {step.details && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <pre className="whitespace-pre-wrap">
                          {typeof step.details === 'object'
                             ? JSON.stringify(step.details, null, 2)
                            : step.details
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                {index < reasoningSteps.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))}
                        
            {currentStep && (
              <div className="reasoning-step current-step">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <LoaderIcon className="h-4 w-4 text-blue-500 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={`text-xs ${getAgentBadgeColor(currentStep.agent)}`}>
                        {currentStep.agent}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        In Progress                      
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {currentStep.step?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatStepContent(currentStep)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RealtimeReasoning;