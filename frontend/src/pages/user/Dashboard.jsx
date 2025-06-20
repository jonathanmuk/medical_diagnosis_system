import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { diagnosticService } from '../../services/api';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [history, setHistory] = useState({
    malaria: [],
    disease: [],
    enhanced: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await diagnosticService.getDiagnosticHistory();
      console.log('Dashboard data:', data);
      
      // Validate and structure the response
      const structuredData = {
        malaria: Array.isArray(data?.malaria) ? data.malaria : [],
        disease: Array.isArray(data?.disease) ? data.disease : [],
        enhanced: Array.isArray(data?.enhanced) ? data.enhanced : []
      };
      
      setHistory(structuredData);
    } catch (error) {
      setError('Failed to load dashboard data. Please try again later.');
      console.error('Error fetching dashboard data:', error);
      setHistory({
        malaria: [],
        disease: [],
        enhanced: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecentPredictions = (limit = 5) => {
    const allPredictions = [
      ...history.malaria.map(item => ({ ...item, type: 'malaria' })),
      ...history.disease.map(item => ({ ...item, type: 'disease' })),
      ...history.enhanced.map(item => ({ ...item, type: 'enhanced' }))
    ];
    
    return allPredictions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  };

  const getTotalPredictions = () => {
    return history.malaria.length + history.disease.length + history.enhanced.length;
  };

  const getSuccessRate = () => {
    const total = getTotalPredictions();
    if (total === 0) return 0;
    
    const completed = history.enhanced.filter(item => item.status === 'completed').length + 
                     history.disease.length + 
                     history.malaria.length;
    
    return Math.round((completed / total) * 100);
  };

  const renderPredictionCard = (prediction) => {
    const getTypeColor = (type) => {
      switch (type) {
        case 'malaria': return 'danger';
        case 'disease': return 'primary';
        case 'enhanced': return 'success';
        default: return 'secondary';
      }
    };

    const getTypeLabel = (type) => {
      switch (type) {
        case 'malaria': return 'Malaria Detection';
        case 'disease': return 'Basic Prediction';
        case 'enhanced': return 'Enhanced Prediction';
        default: return 'Unknown';
      }
    };

    return (
      <Card key={`${prediction.type}-${prediction.id}`} className="mb-3 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <Badge bg={getTypeColor(prediction.type)} className="mb-2">
              {getTypeLabel(prediction.type)}
            </Badge>
            <small className="text-muted">
              {new Date(prediction.created_at).toLocaleDateString()}
            </small>
          </div>
          
          <h6 className="card-title">
            {prediction.type === 'malaria' 
              ? prediction.prediction 
              : (prediction.predicted_disease || 'Unknown').replace(/_/g, ' ')
            }
          </h6>
          
          <div className="mb-2">
            {prediction.type === 'malaria' && (
              <small className="text-muted">
                Confidence: {((prediction.confidence || 0) * 100).toFixed(1)}%
              </small>
            )}
            
            {prediction.type === 'disease' && prediction.symptoms && (
              <div>
                <small className="text-muted d-block">Symptoms analyzed:</small>
                <div className="mt-1">
                  {prediction.symptoms.slice(0, 3).map((symptom, i) => (
                    <Badge key={i} bg="light" text="dark" className="me-1 mb-1">
                      {symptom.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {prediction.symptoms.length > 3 && (
                    <Badge bg="light" text="dark">+{prediction.symptoms.length - 3} more</Badge>
                  )}
                </div>
              </div>
            )}
            
            {prediction.type === 'enhanced' && (
              <div>
                <small className="text-muted">
                  Questions asked: {prediction.questions_asked || 0} | 
                  Status: <span className="text-capitalize">{prediction.status}</span>
                  {prediction.has_reasoning && (
                    <> | <i className="fas fa-brain ms-1"></i> AI Reasoning Available</>
                  )}
                </small>
              </div>
            )}
          </div>
          
          <div className="d-flex gap-2">
            <Button 
              variant="outline-primary" 
              size="sm"
              as={Link}
              to="/diagnostic-history"
            >
              <i className="fas fa-eye me-1"></i>
              View Details
            </Button>
            
            {prediction.type === 'enhanced' && prediction.has_reasoning && (
              <Button variant="outline-info" size="sm">
                <i className="fas fa-brain me-1"></i>
                View Reasoning
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderStatsCards = () => (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="text-center shadow-sm border-0">
          <Card.Body>
            <div className="text-primary mb-2">
              <i className="fas fa-chart-line fa-2x"></i>
            </div>
            <h4 className="mb-1">{getTotalPredictions()}</h4>
            <small className="text-muted">Total Predictions</small>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={3}>
        <Card className="text-center shadow-sm border-0">
          <Card.Body>
            <div className="text-success mb-2">
              <i className="fas fa-robot fa-2x"></i>
            </div>
            <h4 className="mb-1">{history.enhanced.length}</h4>
            <small className="text-muted">Enhanced Predictions</small>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={3}>
        <Card className="text-center shadow-sm border-0">
          <Card.Body>
            <div className="text-info mb-2">
              <i className="fas fa-microscope fa-2x"></i>
            </div>
            <h4 className="mb-1">{history.malaria.length}</h4>
            <small className="text-muted">Malaria Tests</small>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={3}>
        <Card className="text-center shadow-sm border-0">
          <Card.Body>
            <div className="text-warning mb-2">
              <i className="fas fa-percentage fa-2x"></i>
            </div>
            <h4 className="mb-1">{getSuccessRate()}%</h4>
            <small className="text-muted">Completion Rate</small>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const renderQuickActions = () => (
    <Card className="shadow-sm mb-4">
      <Card.Header>
        <h5 className="mb-0">
          <i className="fas fa-bolt me-2"></i>
          Quick Actions
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4} className="mb-3">
            <Button 
              as={Link} 
              to="/disease-prediction" 
              variant="primary" 
              className="w-100"
              size="lg"
            >
              <i className="fas fa-stethoscope me-2"></i>
              Basic Disease Prediction
            </Button>
          </Col>
          <Col md={4} className="mb-3">
            <Button 
              as={Link} 
              to="/enhanced-disease-prediction" 
              variant="success" 
              className="w-100"
              size="lg"
            >
              <i className="fas fa-brain me-2"></i>
              Enhanced AI Prediction
            </Button>
          </Col>
          <Col md={4} className="mb-3">
            <Button 
              as={Link} 
              to="/malaria-detection" 
              variant="danger" 
              className="w-100"
              size="lg"
            >
              <i className="fas fa-microscope me-2"></i>
              Malaria Detection
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <>
        <Header />
        <Container className="py-5">
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading your dashboard...</p>
          </div>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Welcome back, {userProfile?.username || 'User'}!</h2>
            <p className="text-muted mb-0">Here's your diagnostic overview</p>
          </div>
          <Button 
            variant="outline-primary" 
            as={Link} 
            to="/diagnostic-history"
          >
            <i className="fas fa-history me-2"></i>
            View Full History
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {renderStatsCards()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Navigation Tabs */}
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link 
              active={activeSection === 'overview'} 
              onClick={() => setActiveSection('overview')}
            >
              Recent Activity
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeSection === 'enhanced'} 
              onClick={() => setActiveSection('enhanced')}
            >
              Enhanced Predictions ({history.enhanced.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
                        <Nav.Link 
              active={activeSection === 'basic'} 
              onClick={() => setActiveSection('basic')}
            >
              Basic Predictions ({history.disease.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeSection === 'malaria'} 
              onClick={() => setActiveSection('malaria')}
            >
              Malaria Tests ({history.malaria.length})
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Content based on active section */}
        <Row>
          <Col lg={8}>
            <Card className="shadow-sm">
              <Card.Header>
                <h5 className="mb-0">
                  {activeSection === 'overview' && <><i className="fas fa-clock me-2"></i>Recent Predictions</>}
                  {activeSection === 'enhanced' && <><i className="fas fa-brain me-2"></i>Enhanced AI Predictions</>}
                  {activeSection === 'basic' && <><i className="fas fa-stethoscope me-2"></i>Basic Disease Predictions</>}
                  {activeSection === 'malaria' && <><i className="fas fa-microscope me-2"></i>Malaria Detection Results</>}
                </h5>
              </Card.Header>
              <Card.Body>
                {activeSection === 'overview' && (
                  <>
                    {getRecentPredictions().length === 0 ? (
                      <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        No recent predictions found. Start by making your first prediction!
                      </Alert>
                    ) : (
                      getRecentPredictions().map(prediction => renderPredictionCard(prediction))
                    )}
                  </>
                )}

                {activeSection === 'enhanced' && (
                  <>
                    {history.enhanced.length === 0 ? (
                      <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        No enhanced predictions found. Try our AI-powered enhanced prediction system!
                        <div className="mt-2">
                          <Button 
                            as={Link} 
                            to="/enhanced-disease-prediction" 
                            variant="success" 
                            size="sm"
                          >
                            Start Enhanced Prediction
                          </Button>
                        </div>
                      </Alert>
                    ) : (
                      history.enhanced.map(prediction => renderPredictionCard({ ...prediction, type: 'enhanced' }))
                    )}
                  </>
                )}

                {activeSection === 'basic' && (
                  <>
                    {history.disease.length === 0 ? (
                      <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        No basic predictions found. Start with a basic disease prediction!
                        <div className="mt-2">
                          <Button 
                            as={Link} 
                            to="/disease-prediction" 
                            variant="primary" 
                            size="sm"
                          >
                            Start Basic Prediction
                          </Button>
                        </div>
                      </Alert>
                    ) : (
                      history.disease.map(prediction => renderPredictionCard({ ...prediction, type: 'disease' }))
                    )}
                  </>
                )}

                {activeSection === 'malaria' && (
                  <>
                    {history.malaria.length === 0 ? (
                      <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        No malaria tests found. Upload an image for malaria detection!
                        <div className="mt-2">
                          <Button 
                            as={Link} 
                            to="/malaria-detection" 
                            variant="danger" 
                            size="sm"
                          >
                            Start Malaria Test
                          </Button>
                        </div>
                      </Alert>
                    ) : (
                      history.malaria.map(prediction => renderPredictionCard({ ...prediction, type: 'malaria' }))
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            {/* System Information */}
            <Card className="shadow-sm mb-4">
              <Card.Header>
                <h6 className="mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  System Information
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Prediction Types Available:</strong>
                  <ul className="mt-2 mb-0">
                    <li><Badge bg="primary" className="me-1"></Badge>Basic Disease Prediction</li>
                    <li><Badge bg="success" className="me-1"></Badge>Enhanced AI Prediction</li>
                    <li><Badge bg="danger" className="me-1"></Badge>Malaria Detection</li>
                  </ul>
                </div>
                
                <div className="mb-3">
                  <strong>Enhanced Features:</strong>
                  <ul className="mt-2 mb-0">
                    <li><i className="fas fa-brain text-success me-1"></i>Multi-agent reasoning</li>
                    <li><i className="fas fa-comments text-info me-1"></i>Follow-up questions</li>
                    <li><i className="fas fa-database text-warning me-1"></i>External knowledge base</li>
                    <li><i className="fas fa-eye text-primary me-1"></i>Transparent explanations</li>
                  </ul>
                </div>
              </Card.Body>
            </Card>

            {/* Recent Activity Summary */}
            <Card className="shadow-sm">
              <Card.Header>
                <h6 className="mb-0">
                  <i className="fas fa-chart-bar me-2"></i>
                  Activity Summary
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Total Predictions:</span>
                  <Badge bg="secondary">{getTotalPredictions()}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Enhanced Predictions:</span>
                  <Badge bg="success">{history.enhanced.length}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Basic Predictions:</span>
                  <Badge bg="primary">{history.disease.length}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>Malaria Tests:</span>
                  <Badge bg="danger">{history.malaria.length}</Badge>
                </div>
                
                <hr />
                
                <div className="text-center">
                  <div className="mb-2">
                    <strong>Completion Rate</strong>
                  </div>
                  <div className="progress mb-2" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: `${getSuccessRate()}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">{getSuccessRate()}% of predictions completed</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default Dashboard;

