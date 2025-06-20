import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Tabs, Tab, Modal } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { diagnosticService } from '../../services/api';

const DiagnosticHistory = () => {
  const [history, setHistory] = useState({
    malaria: [],
    disease: [],
    enhanced: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('enhanced');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await diagnosticService.getDiagnosticHistory();
        console.log('API Response:', data);
        
        // Validate and structure the response
        const structuredData = {
                    malaria: Array.isArray(data?.malaria) ? data.malaria : [],
          disease: Array.isArray(data?.disease) ? data.disease : [],
          enhanced: Array.isArray(data?.enhanced) ? data.enhanced : []
        };
        
        setHistory(structuredData);
      } catch (error) {
        setError('Failed to load diagnostic history. Please try again later.');
        console.error('Error fetching history:', error);
        // Ensure history state remains valid even on error
        setHistory({
          malaria: [],
          disease: [],
          enhanced: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleViewDetails = (result, type) => {
    setSelectedResult({ ...result, type });
    setShowDetailModal(true);
  };

  const renderDetailModal = () => {
    if (!selectedResult) return null;

    return (
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${
              selectedResult.type === 'malaria' ? 'fa-microscope' :
              selectedResult.type === 'enhanced' ? 'fa-brain' : 'fa-stethoscope'
            } me-2`}></i>
            {selectedResult.type === 'malaria' ? 'Malaria Detection' :
             selectedResult.type === 'enhanced' ? 'Enhanced Prediction' : 'Basic Prediction'} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <h6>Basic Information</h6>
              <p><strong>Date:</strong> {new Date(selectedResult.created_at).toLocaleString()}</p>
              <p><strong>Result ID:</strong> {selectedResult.id}</p>
              
              {selectedResult.type === 'malaria' && (
                <>
                  <p><strong>Result:</strong> 
                    <Badge bg={selectedResult.is_infected ? 'danger' : 'success'} className="ms-2">
                      {selectedResult.prediction}
                    </Badge>
                  </p>
                  <p><strong>Confidence:</strong> {((selectedResult.confidence || 0) * 100).toFixed(2)}%</p>
                </>
              )}
              
              {(selectedResult.type === 'disease' || selectedResult.type === 'enhanced') && (
                <>
                  <p><strong>Predicted Disease:</strong> 
                    <Badge bg="primary" className="ms-2">
                      {(selectedResult.predicted_disease || 'Unknown').replace(/_/g, ' ')}
                    </Badge>
                  </p>
                  <p><strong>Prediction Type:</strong> 
                    <Badge bg={selectedResult.type === 'enhanced' ? 'success' : 'info'} className="ms-2">
                      {selectedResult.prediction_type || selectedResult.type}
                    </Badge>
                  </p>
                </>
              )}
            </Col>
            
            <Col md={6}>
              {selectedResult.type === 'enhanced' && (
                <>
                  <h6>Enhanced Features</h6>
                  <p><strong>Status:</strong> 
                    <Badge bg="success" className="ms-2">{selectedResult.status}</Badge>
                  </p>
                  <p><strong>Questions Asked:</strong> {selectedResult.questions_asked || 0}</p>
                  <p><strong>AI Reasoning:</strong> 
                    <Badge bg={selectedResult.has_reasoning ? 'success' : 'secondary'} className="ms-2">
                      {selectedResult.has_reasoning ? 'Available' : 'Not Available'}
                    </Badge>
                  </p>
                  {selectedResult.session_id && (
                    <p><strong>Session ID:</strong> <code>{selectedResult.session_id}</code></p>
                  )}
                </>
              )}
            </Col>
          </Row>
          
          {selectedResult.symptoms && selectedResult.symptoms.length > 0 && (
            <>
              <hr />
              <h6>Symptoms Analyzed</h6>
              <div className="d-flex flex-wrap gap-2">
                {selectedResult.symptoms.map((symptom, index) => (
                  <Badge key={index} bg="light" text="dark">
                    {symptom.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </>
          )}
          
          {selectedResult.image_url && (
            <>
              <hr />
              <h6>Uploaded Image</h6>
              <img 
                src={selectedResult.image_url} 
                alt="Malaria test" 
                className="img-fluid rounded"
                style={{ maxHeight: '300px' }}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
          {selectedResult.type === 'enhanced' && selectedResult.has_reasoning && (
            <Button variant="info">
              <i className="fas fa-brain me-1"></i>
              View AI Reasoning
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    );
  };

  const renderEnhancedHistory = () => {
    if (!history || !Array.isArray(history.enhanced) || history.enhanced.length === 0) {
      return (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No enhanced predictions found. Try our AI-powered enhanced prediction system!
        </Alert>
      );
    }

    return (
      <Table responsive striped hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Predicted Disease</th>
            <th>Status</th>
            <th>Questions Asked</th>
            <th>AI Features</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.enhanced.map((item, index) => (
            <tr key={item.id || index}>
              <td>{index + 1}</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td className="text-capitalize">
                {(item.predicted_disease || 'Unknown').replace(/_/g, ' ')}
              </td>
              <td>
                <Badge bg={
                  item.status === 'completed' ? 'success' :
                  item.status === 'waiting_for_input' ? 'warning' : 'info'
                }>
                  {item.status || 'Unknown'}
                </Badge>
              </td>
              <td>
                <Badge bg="secondary">{item.questions_asked || 0}</Badge>
              </td>
              <td>
                <div className="d-flex gap-1">
                  {item.has_reasoning && (
                    <Badge bg="info" title="AI Reasoning Available">
                      <i className="fas fa-brain"></i>
                    </Badge>
                  )}
                  <Badge bg="success" title="Multi-agent System">
                    <i className="fas fa-users"></i>
                  </Badge>
                  <Badge bg="warning" title="External Knowledge">
                    <i className="fas fa-database"></i>
                  </Badge>
                </div>
              </td>
              <td>
                <div className="d-flex gap-1">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handleViewDetails(item, 'enhanced')}
                  >
                    <i className="fas fa-eye me-1"></i>
                    Details
                  </Button>
                  {item.has_reasoning && (
                    <Button variant="outline-info" size="sm">
                      <i className="fas fa-brain me-1"></i>
                      Reasoning
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderDiseaseHistory = () => {
    if (!history || !Array.isArray(history.disease) || history.disease.length === 0) {
      return (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No basic disease prediction history found.
        </Alert>
      );
    }

    return (
      <Table responsive striped hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Symptoms</th>
            <th>Predicted Disease</th>
            <th>Confidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.disease.map((item, index) => (
            <tr key={item.id || index}>
              <td>{index + 1}</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>
                {Array.isArray(item.symptoms) && item.symptoms.slice(0, 3).map((symptom, i) => (
                  <Badge bg="secondary" className="me-1 mb-1 text-capitalize" key={i}>
                    {symptom.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {Array.isArray(item.symptoms) && item.symptoms.length > 3 && (
                  <Badge bg="secondary">+{item.symptoms.length - 3} more</Badge>
                )}
              </td>
              <td className="text-capitalize">
                {(item.predicted_disease || '').replace(/_/g, ' ')}
              </td>
              <td>
                <Badge bg={
                  item.confidence === 'High' ? 'success' :
                  item.confidence === 'Medium' ? 'warning' : 'info'
                }>
                  {item.confidence || 'Unknown'}
                </Badge>
              </td>
              <td>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => handleViewDetails(item, 'disease')}
                >
                  <i className="fas fa-eye me-1"></i>
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderMalariaHistory = () => {
    if (!history || !Array.isArray(history.malaria) || history.malaria.length === 0) {
      return (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No malaria diagnostic history found.
        </Alert>
      );
    }

    return (
      <Table responsive striped hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Result</th>
            <th>Confidence</th>
            <th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.malaria.map((item, index) => (
            <tr key={item.id || index}>
              <td>{index + 1}</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>
                <Badge bg={item.is_infected ? 'danger' : 'success'}>
                  {item.prediction}
                </Badge>
              </td>
              <td>{((item.confidence || 0) * 100).toFixed(2)}%</td>
              <td>
                {item.image_url ? (
                  <Badge bg="success">
                    <i className="fas fa-image me-1"></i>
                    Available
                  </Badge>
                ) : (
                  <Badge bg="secondary">
                    <i className="fas fa-times me-1"></i>
                    Not Available
                  </Badge>
                )}
              </td>
              <td>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => handleViewDetails(item, 'malaria')}
                >
                  <i className="fas fa-eye me-1"></i>
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <>
      <Header />
      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Diagnostic History</h2>
            <p className="text-muted mb-0">View all your previous predictions and results</p>
          </div>
          <div className="d-flex gap-2">
            <Badge bg="success">{history.enhanced.length} Enhanced</Badge>
            <Badge bg="primary">{history.disease.length} Basic</Badge>
            <Badge bg="danger">{history.malaria.length} Malaria</Badge>
          </div>
        </div>
        
        {error && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading your diagnostic history...</p>
          </div>
        ) : (
          <Card className="shadow-sm">
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                <Tab 
                  eventKey="enhanced" 
                  title={
                    <span>
                      <i className="fas fa-brain me-1"></i>
                      Enhanced Predictions ({history.enhanced.length})
                    </span>
                  }
                >
                  {renderEnhancedHistory()}
                </Tab>
                
                <Tab 
                  eventKey="disease" 
                  title={
                    <span>
                      <i className="fas fa-stethoscope me-1"></i>
                      Basic Predictions ({history.disease.length})
                    </span>
                  }
                >
                  {renderDiseaseHistory()}
                </Tab>
                
                <Tab 
                  eventKey="malaria" 
                  title={
                    <span>
                      <i className="fas fa-microscope me-1"></i>
                      Malaria Detection ({history.malaria.length})
                    </span>
                  }
                >
                  {renderMalariaHistory()}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        )}
      </Container>
      
      {renderDetailModal()}
      <Footer />
    </>
  );
};

export default DiagnosticHistory;

